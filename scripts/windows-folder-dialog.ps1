param(
    [Parameter(Mandatory = $true)][int]$ApplicationProcessId,
    [ValidateSet('Cancel', 'Select')][string]$Mode = 'Cancel',
    [string]$ProjectDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

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

if ($Mode -eq 'Select') {
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
    $value = $folderEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    $value.SetValue((Resolve-Path -LiteralPath $ProjectDirectory).Path)
    $buttonId = '1'
} else {
    $buttonId = '2'
}

$buttonCondition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $buttonId
)
$button = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
if ($null -eq $button) { throw "The native dialog button $buttonId is missing." }
$invoke = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
$invoke.Invoke()
@{ result = 'PASS'; operation = $Mode; nativeDialog = $true } | ConvertTo-Json -Compress
