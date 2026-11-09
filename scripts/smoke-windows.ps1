param([string]$Executable,[string]$TestDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
if (-not $Executable) { $Executable = Join-Path $root "dist/Suichu-v$version-win-x64.exe" }
if (-not $TestDirectory) { $TestDirectory = Join-Path $env:TEMP ("Suichu-QA-" + [guid]::NewGuid().ToString('N')) }
$testPath = [IO.Path]::GetFullPath($TestDirectory)
$originalPath = $env:PATH
try {
    $env:SUICHU_DATA_DIR = $testPath
    $env:SUICHU_TEST_NO_DIALOG = '1'
    Remove-Item Env:SUICHU_PROFILE -ErrorAction SilentlyContinue
    $env:PATH = "$env:SystemRoot\System32;$env:SystemRoot"
    foreach ($iteration in @(1,2)) {
        $process = Start-Process -FilePath ([IO.Path]::GetFullPath($Executable)) -PassThru -WindowStyle Hidden
        if (-not $process.WaitForExit(60000) -or $process.ExitCode -ne 0) { throw "EXE start $iteration failed" }
        $state = Get-Content -LiteralPath (Join-Path $testPath 'status.json') -Raw | ConvertFrom-Json
        if ($iteration -eq 1) { $firstPid = $state.controllerPid } elseif ($state.controllerPid -ne $firstPid) { throw 'Repeated launch created duplicate service' }
    }
    if (Get-Command node,python -ErrorAction SilentlyContinue) { throw 'Test PATH unexpectedly contains Node/Python' }
    $bundledNode = Join-Path $testPath "application/$version/runtime/node.exe"
    & $bundledNode (Join-Path $PSScriptRoot 'verify-windows.cjs') $testPath
    if ($LASTEXITCODE -ne 0) { throw 'EXE browser verification failed' }
} finally {
    $env:PATH = $originalPath
    if (Test-Path -LiteralPath $testPath) { [IO.File]::WriteAllText((Join-Path $testPath 'stop.request'),'stop') }
}
