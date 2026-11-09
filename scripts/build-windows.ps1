param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'dist' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid version' }
$build = Join-Path $output "build-$version"
$payload = Join-Path $build ('payload-' + [guid]::NewGuid().ToString('N'))
$runtime = Join-Path $payload 'runtime'
$app = Join-Path $payload 'app'
New-Item -ItemType Directory -Path $runtime,$app -Force | Out-Null
# Official Windows runtime, pinned and verified against Node.js SHASUMS256.txt.
$nodeVersion = '24.22.1'
$nodeHash = 'd2046d28c2c3dcd211ac5145c0bf30e2047ef9dfb306693c8c6e2eccd8b95fa5'
$nodeArchive = Join-Path $build "node-v$nodeVersion-win-x64.zip"
if (-not (Test-Path -LiteralPath $nodeArchive)) { Invoke-WebRequest -Uri "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" -OutFile $nodeArchive }
if ((Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $nodeHash) { throw 'Node runtime checksum mismatch' }
$nodeUnpack = Join-Path $build 'official-node'
Expand-Archive -LiteralPath $nodeArchive -DestinationPath $nodeUnpack -Force
$nodeRoot = Join-Path $nodeUnpack "node-v$nodeVersion-win-x64"
Copy-Item -LiteralPath (Join-Path $nodeRoot 'node.exe') -Destination $runtime -Force
Copy-Item -LiteralPath (Join-Path $nodeRoot 'LICENSE') -Destination (Join-Path $runtime 'NODE-LICENSE.txt') -Force
$files = @('console-controller.cjs','console.html','launch.cjs','runtime.cjs','route.cjs','search.cjs','geo.cjs','GCOORD-LICENSE.txt','default-target.json','package.json','README.md','LICENSE')
foreach ($name in $files) { Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $app -Force }
$manifest = [ordered]@{}
foreach ($file in Get-ChildItem -LiteralPath $payload -Recurse -File | Sort-Object FullName) {
    if ($file.Name -eq 'payload-manifest.json') { continue }
    $relative = $file.FullName.Substring($payload.Length + 1).Replace('\','/')
    $manifest[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifestPath = Join-Path $payload 'payload-manifest.json'
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
$manifestHash = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
$archive = Join-Path $build 'payload.zip'
Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $archive -Force
$source = [IO.File]::ReadAllText((Join-Path $projectRoot 'windows/Launcher.cs')).Replace('__VERSION__',$version).Replace('__MANIFEST_HASH__',$manifestHash)
$generated = Join-Path $build 'Launcher.cs'
[IO.File]::WriteAllText($generated,$source,[Text.UTF8Encoding]::new($true))
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$exe = Join-Path $output "Suichu-v$version-win-x64.exe"
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$exe" "/win32manifest:$(Join-Path $projectRoot 'windows/app.manifest')" "/resource:$archive,Suichu.Payload" /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:System.Web.Extensions.dll /reference:System.Windows.Forms.dll $generated
if ($LASTEXITCODE -ne 0) { throw 'Windows launcher compilation failed' }
Write-Output $exe
