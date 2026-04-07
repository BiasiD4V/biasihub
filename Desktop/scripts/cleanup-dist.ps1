param(
  [string]$DistDir = (Join-Path $PSScriptRoot '..\\dist-installer'),
  [int]$KeepCount = 2
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DistDir)) {
  Write-Host "Dist directory not found: $DistDir"
  exit 0
}

$resolvedDist = (Resolve-Path $DistDir).Path

if ($KeepCount -lt 1) {
  throw 'KeepCount must be >= 1'
}

function Get-VersionFromName {
  param([string]$Name)
  if ($Name -match 'Setup (\d+\.\d+\.\d+)\.exe$') { return $Matches[1] }
  if ($Name -match 'Setup (\d+\.\d+\.\d+)\.exe\.blockmap$') { return $Matches[1] }
  if ($Name -match 'setup-(\d+\.\d+\.\d+)\.exe$') { return $Matches[1] }
  if ($Name -match 'setup-(\d+\.\d+\.\d+)\.exe\.blockmap$') { return $Matches[1] }
  if ($Name -match '-(\d+\.\d+\.\d+)-x64\.nsis\.7z$') { return $Matches[1] }
  return $null
}

$setupExes = Get-ChildItem -Path $resolvedDist -File |
  Where-Object { ($_.Name -match 'Setup .*\.exe$' -or $_.Name -match 'setup-\d+\.\d+\.\d+\.exe$') -and $_.Name -notmatch '\.blockmap$' }

$versionRows = @()
foreach ($file in $setupExes) {
  $verString = Get-VersionFromName -Name $file.Name
  if (-not $verString) { continue }
  $versionRows += [PSCustomObject]@{
    VersionString = $verString
    Version = [version]$verString
  }
}

if ($versionRows.Count -eq 0) {
  Write-Host "No setup versions found in $resolvedDist"
  exit 0
}

$keepVersions = $versionRows |
  Sort-Object Version -Descending |
  Select-Object -Unique -ExpandProperty VersionString -First $KeepCount

Write-Host ("Keeping versions: " + ($keepVersions -join ', '))

$removed = @()

Get-ChildItem -Path $resolvedDist -File | ForEach-Object {
  $name = $_.Name
  $versionInFile = Get-VersionFromName -Name $name
  if (-not $versionInFile) { return }
  if ($keepVersions -contains $versionInFile) { return }

  Remove-Item -LiteralPath $_.FullName -Force
  $removed += $name
}

if ($removed.Count -eq 0) {
  Write-Host 'No old versioned artifacts to remove.'
} else {
  Write-Host 'Removed artifacts:'
  $removed | ForEach-Object { Write-Host " - $_" }
}
