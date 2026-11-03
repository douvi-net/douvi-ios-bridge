param(
    [Parameter(Mandatory = $true)][int]$ApplicationProcessId,
    [ValidateSet('Cancel', 'Select')][string]$Mode = 'Cancel',
    [string]$ProjectDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class FolderDialogNative {
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
    $edits = @($dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition))
    $folderEdit = $edits | Where-Object { $_.Current.Name -in @('Folder:', 'File name:') } | Select-Object -First 1
    if ($null -eq $folderEdit -and $edits.Count -eq 1) { $folderEdit = $edits[0] }
    if ($null -eq $folderEdit) {
        $names = @($edits | ForEach-Object { $_.Current.Name }) -join ', '
        throw "Cannot identify the native folder field. Available edit labels: $names"
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

    $buttonCondition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Button
    )
    $buttons = @($dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition))
    $button = $buttons | Where-Object { $_.Current.Name -in @('Select Folder', 'Open') } | Select-Object -First 1
    if ($null -eq $button) {
        $button = $buttons | Where-Object { $_.Current.AutomationId -eq '1' } | Select-Object -First 1
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
