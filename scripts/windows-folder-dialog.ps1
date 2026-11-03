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
using System.Text;
public static class FolderDialogNative {
    [StructLayout(LayoutKind.Sequential)]
    public struct Rect { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)]
    public struct GuiThreadInfo {
        public int cbSize;
        public uint flags;
        public IntPtr active, focus, capture, menuOwner, moveSize, caret;
        public Rect caretRect;
    }
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetGUIThreadInfo(uint threadId, ref GuiThreadInfo info);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr window, StringBuilder name, int count);
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

    public static IntPtr FocusedDialogEdit(IntPtr dialog, uint expectedProcess) {
        uint process;
        uint thread = GetWindowThreadProcessId(dialog, out process);
        if (thread == 0 || process != expectedProcess) return IntPtr.Zero;
        var info = new GuiThreadInfo();
        info.cbSize = Marshal.SizeOf(typeof(GuiThreadInfo));
        if (!GetGUIThreadInfo(thread, ref info) || !IsChild(dialog, info.focus)) return IntPtr.Zero;
        GetWindowThreadProcessId(info.focus, out process);
        var name = new StringBuilder(256);
        GetClassName(info.focus, name, name.Capacity);
        return process == expectedProcess && name.ToString() == "Edit" ? info.focus : IntPtr.Zero;
    }

    public static string FocusDescription(IntPtr dialog, uint expectedProcess) {
        uint process;
        uint thread = GetWindowThreadProcessId(dialog, out process);
        var info = new GuiThreadInfo();
        info.cbSize = Marshal.SizeOf(typeof(GuiThreadInfo));
        if (thread == 0 || process != expectedProcess) return "dialog owner changed";
        if (!GetGUIThreadInfo(thread, ref info)) return "GUI thread error " + Marshal.GetLastWin32Error();
        GetWindowThreadProcessId(info.focus, out process);
        if (process != expectedProcess) return "focus is outside the tested application";
        var name = new StringBuilder(256);
        GetClassName(info.focus, name, name.Capacity);
        return "focus class=" + name + "; dialog child=" + IsChild(dialog, info.focus);
    }
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
    # Use the shell's normal address-bar shortcut. The managed UIA proxy on
    # hosted Windows can omit/misidentify shell edits, so identify the focused
    # native Edit by its GUI thread, process and parent dialog instead.
    Send-DialogKeys '%d'
    $editDeadline = [DateTime]::UtcNow.AddSeconds(5)
    $editWindow = [IntPtr]::Zero
    while ([DateTime]::UtcNow -lt $editDeadline) {
        $editWindow = [FolderDialogNative]::FocusedDialogEdit($dialogWindow, $ApplicationProcessId)
        if ($editWindow -ne [IntPtr]::Zero) { break }
        Start-Sleep -Milliseconds 200
    }
    if ($editWindow -eq [IntPtr]::Zero) {
        $description = [FolderDialogNative]::FocusDescription($dialogWindow, $ApplicationProcessId)
        throw "The native dialog address edit did not receive focus: $description"
    }
    $directory = (Resolve-Path -LiteralPath $ProjectDirectory).Path
    $messageResult = [IntPtr]::Zero
    # WM_SETTEXT, bounded to two seconds, on this dialog's focused native Edit.
    $sent = [FolderDialogNative]::SendMessageTimeout(
        $editWindow, 0x000C, [IntPtr]::Zero, $directory, 0x0002, 2000, [ref]$messageResult
    )
    if ($sent -eq [IntPtr]::Zero -or $messageResult -eq [IntPtr]::Zero) {
        throw 'Cannot enter the fixture path in the native address field.'
    }
    Send-DialogKeys '{ENTER}'
    $navigationDeadline = [DateTime]::UtcNow.AddSeconds(5)
    while ([DateTime]::UtcNow -lt $navigationDeadline) {
        if ([FolderDialogNative]::FocusedDialogEdit($dialogWindow, $ApplicationProcessId) -eq [IntPtr]::Zero) { break }
        Start-Sleep -Milliseconds 200
    }
    # WM_COMMAND / IDOK is the native dialog confirmation. The caller still
    # requires the picker result to reach Rust and render the expected fixture.
    if ((Get-OwnedWindow $dialog) -ne $dialogWindow -or
        -not [FolderDialogNative]::PostMessage($dialogWindow, 0x0111, [IntPtr]1, [IntPtr]::Zero)) {
        throw 'Cannot confirm the native folder selection.'
    }
}
@{ result = 'PASS'; operation = $Mode; nativeDialog = $true } | ConvertTo-Json -Compress
