$ErrorActionPreference = 'Stop'
$dist = Join-Path (Split-Path -Parent $PSScriptRoot) 'dist'
$lines = foreach ($file in Get-ChildItem -LiteralPath $dist -File | Where-Object Extension -in @('.exe','.zip') | Sort-Object Name) {
    "{0}  {1}" -f (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant(),$file.Name
}
[IO.File]::WriteAllText((Join-Path $dist 'SHA256SUMS.txt'),(($lines -join "`n") + "`n"),[Text.UTF8Encoding]::new($false))
