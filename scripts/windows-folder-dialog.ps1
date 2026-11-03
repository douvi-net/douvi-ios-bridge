param(
    [Parameter(Mandatory = $true)][int]$ApplicationProcessId,
    [ValidateSet('Cancel', 'Select')][string]$Mode = 'Cancel',
    [string]$ProjectDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class FolderDialogNative {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool IsChild(IntPtr parent, IntPtr child);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr window, uint message, IntPtr wParam,
        string lParam, uint flags, uint timeout, out IntPtr result);
}
'@

function Get-OwnedWindow($element) {
    $window = [IntPtr]$element.Current.NativeWindowHandle
    [uint32]$ownerProcess = 0
    if ($window -eq [IntPtr]::Zero -or
        [FolderDialogNative]::GetWindowThreadProcessId($window, [ref]$ownerProcess) -eq 0 -or
        $ownerProcess -ne $ApplicationProcessId) {
        throw 'The dialog control has no native window owned by the tested application.'
    }
    return $window
}

function Send-DialogKeys([string]$keys) {
    [void][FolderDialogNative]::SetForegroundWindow($dialogWindow)
    if ([FolderDialogNative]::GetForegroundWindow() -ne $dialogWindow) {
        throw 'The tested folder dialog could not receive keyboard focus.'
    }
    [System.Windows.Forms.SendKeys]::SendWait($keys)
}

# Only the app started by windows-smoke.mjs is eligible for interaction.
$processCondition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $ApplicationProcessId
)
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$dialog = $null
while ([DateTime]::UtcNow -lt $deadline) {
    $elements = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
        [System.Windows.Automation.TreeScope]::Children, $processCondition
    )
    foreach ($element in $elements) {
        if ($element.Current.ClassName -eq '#32770') { $dialog = $element; break }
    }
    if ($null -ne $dialog) { break }
    Start-Sleep -Milliseconds 200
}
if ($null -eq $dialog) { throw 'The native folder dialog did not open.' }
$dialogWindow = Get-OwnedWindow $dialog

if ($Mode -eq 'Cancel') {
    $windowPattern = $null
    if ($dialog.TryGetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern, [ref]$windowPattern)) {
        $windowPattern.Close()
    } elseif (-not [FolderDialogNative]::PostMessage($dialogWindow, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)) {
        throw 'Cannot close the native folder dialog.'
    }
} else {
    if (-not (Test-Path -LiteralPath $ProjectDirectory -PathType Container)) {
        throw 'The public metadata fixture directory is missing.'
    }
    $editCondition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )
    # The shell populates its controls asynchronously. Some folder-picker layouts
    # omit the bottom Folder field entirely; use their normal address bar instead.
    $editDeadline = [DateTime]::UtcNow.AddSeconds(4)
    $folderEdit = $null
    while ([DateTime]::UtcNow -lt $editDeadline) {
        $edits = @($dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition))
        $folderEdit = $edits | Where-Object {
            $_.Current.Name -match '^(Folder|File name):?$' -and -not $_.Current.IsOffscreen
        } | Select-Object -First 1
        if ($null -ne $folderEdit) { break }
        Start-Sleep -Milliseconds 200
    }
    $useAddressBar = $null -eq $folderEdit
    if ($useAddressBar) {
        Send-DialogKeys '%d'
        $editDeadline = [DateTime]::UtcNow.AddSeconds(4)
        while ([DateTime]::UtcNow -lt $editDeadline) {
            $focused = [System.Windows.Automation.AutomationElement]::FocusedElement
            if ($focused.Current.ProcessId -eq $ApplicationProcessId -and
                $focused.Current.ControlType -eq [System.Windows.Automation.ControlType]::Edit) {
                $focusedWindow = Get-OwnedWindow $focused
                if ([FolderDialogNative]::IsChild($dialogWindow, $focusedWindow)) {
                    $folderEdit = $focused
                    break
                }
            }
            Start-Sleep -Milliseconds 200
        }
    }
    if ($null -eq $folderEdit) {
        $names = @($edits | ForEach-Object { "$($_.Current.Name) [$($_.Current.AutomationId)]" }) -join ', '
        throw "Cannot identify the native folder or address field. Available edits: $names"
    }
    $directory = (Resolve-Path -LiteralPath $ProjectDirectory).Path
    $valuePattern = $null
    if ($folderEdit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
        $valuePattern.SetValue($directory)
    } else {
        $editWindow = Get-OwnedWindow $folderEdit
        $messageResult = [IntPtr]::Zero
        # WM_SETTEXT, bounded to two seconds; only the identified folder edit is eligible.
        $sent = [FolderDialogNative]::SendMessageTimeout(
            $editWindow, 0x000C, [IntPtr]::Zero, $directory, 0x0002, 2000, [ref]$messageResult
        )
        if ($sent -eq [IntPtr]::Zero -or $messageResult -eq [IntPtr]::Zero) {
            throw 'Cannot enter the fixture path in the native folder field.'
        }
    }
    if ($useAddressBar) {
        Send-DialogKeys '{ENTER}'
        # Wait for the shell to finish navigation before confirming the directory.
        $navigationDeadline = [DateTime]::UtcNow.AddSeconds(5)
        while ([DateTime]::UtcNow -lt $navigationDeadline) {
            try {
                if ($folderEdit.Current.IsOffscreen) { break }
            } catch [System.Windows.Automation.ElementNotAvailableException] { break }
            Start-Sleep -Milliseconds 200
        }
    }

    $buttonCondition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Button
    )
    $buttons = @($dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition))
    $button = $buttons | Where-Object {
        $_.Current.Name -in @('Select Folder', 'Open') -and $_.Current.IsEnabled -and -not $_.Current.IsOffscreen
    } | Select-Object -First 1
    if ($null -eq $button) {
        $button = $buttons | Where-Object {
            $_.Current.AutomationId -eq '1' -and $_.Current.IsEnabled -and -not $_.Current.IsOffscreen
        } | Select-Object -First 1
    }
    if ($null -eq $button) {
        $labels = @($buttons | ForEach-Object { "$($_.Current.Name) [$($_.Current.AutomationId)]" }) -join ', '
        throw "Cannot identify the native folder confirmation button. Available buttons: $labels"
    }
    $invokePattern = $null
    if ($button.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePattern)) {
        $invokePattern.Invoke()
    } else {
        $buttonWindow = Get-OwnedWindow $button
        # BM_CLICK on this dialog's actual Button; never match an AutomationId alone.
        if (-not [FolderDialogNative]::PostMessage($buttonWindow, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)) {
            throw 'Cannot confirm the native folder selection.'
        }
    }
}
@{ result = 'PASS'; operation = $Mode; nativeDialog = $true } | ConvertTo-Json -Compress
