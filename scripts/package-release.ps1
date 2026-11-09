param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'dist' }
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }
$stage = Join-Path $outputPath ("source-" + [guid]::NewGuid().ToString('N') + '/suichu-browser-location')
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$files = @('console-controller.cjs','console.html','launch.cjs','runtime.cjs','route.cjs','route.test.cjs','geo.cjs','GCOORD-LICENSE.txt','search.cjs','search.test.cjs','启动网页定位.vbs','start.cmd','default-target.json','package.json','README.md','LICENSE','CHANGELOG.md','CONTRIBUTING.md','docs','windows','scripts')
foreach ($name in $files) { Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $stage -Recurse -Force }
$archivePath = Join-Path $outputPath "suichu-browser-location-v$version.zip"
Compress-Archive -LiteralPath $stage -DestinationPath $archivePath -Force
$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $outputPath 'SHA256SUMS.txt'), "$hash  $([IO.Path]::GetFileName($archivePath))`n", [Text.UTF8Encoding]::new($false))
Write-Output $archivePath
