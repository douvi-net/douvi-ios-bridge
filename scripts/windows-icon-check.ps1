param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$ExpectedIcon
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing @'
using System;
using System.Drawing;
using System.Runtime.InteropServices;
public static class WindowsBrandIcon {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern uint ExtractIconEx(string file, int index,
        out IntPtr large, out IntPtr small, uint count);
    [DllImport("user32.dll")]
    private static extern bool DestroyIcon(IntPtr icon);

    public static Bitmap Read(string file) {
        IntPtr large = IntPtr.Zero, small = IntPtr.Zero;
        try {
            if (ExtractIconEx(file, 0, out large, out small, 1) == 0 || large == IntPtr.Zero)
                throw new InvalidOperationException("The executable has no extractable icon.");
            using (var icon = Icon.FromHandle(large)) return icon.ToBitmap();
        } finally {
            if (large != IntPtr.Zero) DestroyIcon(large);
            if (small != IntPtr.Zero) DestroyIcon(small);
        }
    }

    public static Bitmap Opaque(Bitmap source) {
        var result = new Bitmap(source.Width, source.Height);
        using (var graphics = Graphics.FromImage(result)) {
            graphics.Clear(Color.White);
            graphics.DrawImageUnscaled(source, 0, 0);
        }
        return result;
    }
}
'@

$actual = $null
$expected = $null
$expectedBitmap = $null
$actualCanvas = $null
$expectedCanvas = $null
try {
    $actual = [WindowsBrandIcon]::Read((Resolve-Path -LiteralPath $Executable).Path)
    $expected = [System.Drawing.Icon]::new((Resolve-Path -LiteralPath $ExpectedIcon).Path, $actual.Width, $actual.Height)
    $expectedBitmap = $expected.ToBitmap()
    $actualCanvas = [WindowsBrandIcon]::Opaque($actual)
    $expectedCanvas = [WindowsBrandIcon]::Opaque($expectedBitmap)
    if ($actualCanvas.Size -ne $expectedCanvas.Size) { throw 'Extracted icon dimensions differ.' }
    [double]$difference = 0
    for ($y = 0; $y -lt $actualCanvas.Height; $y++) {
        for ($x = 0; $x -lt $actualCanvas.Width; $x++) {
            $a = $actualCanvas.GetPixel($x, $y)
            $b = $expectedCanvas.GetPixel($x, $y)
            $difference += [Math]::Abs([int]$a.R - $b.R) + [Math]::Abs([int]$a.G - $b.G) + [Math]::Abs([int]$a.B - $b.B)
        }
    }
    $mean = $difference / ($actualCanvas.Width * $actualCanvas.Height * 3)
    if ($mean -gt 2) { throw "Embedded icon does not match the approved ICO (mean channel difference $mean)." }
    @{ result = 'PASS'; width = $actual.Width; height = $actual.Height; mean_channel_difference = $mean } | ConvertTo-Json -Compress
} finally {
    foreach ($item in @($actual, $expected, $expectedBitmap, $actualCanvas, $expectedCanvas)) {
        if ($null -ne $item) { $item.Dispose() }
    }
}
