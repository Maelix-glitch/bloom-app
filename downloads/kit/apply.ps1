# ============================================================================
#  Bloom — Rewards page kit (Windows)
#
#  Run one command in the VS Code terminal, from inside the extracted folder:
#
#      powershell -ExecutionPolicy Bypass -File apply.ps1
#
#  What it does:
#    1. finds your bloom-app project (or clones it if you don't have one)
#    2. copies only the Rewards page files into it
#    3. removes the two old shop files the new page replaces
#    4. installs dependencies if they are missing
#    5. offers to start the app
#
#  Nothing here touches your database, your .env, or anything outside the
#  Rewards feature. Every file it overwrites is backed up first.
# ============================================================================

$ErrorActionPreference = "Stop"

$Here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Files  = Join-Path $Here "files"
$Remove = Join-Path $Here "remove.txt"
$Branch = "arena/01a087e8-bloom-app"
$Repo   = "https://github.com/Maelix-glitch/bloom-app.git"
$Stamp  = Get-Date -Format "yyyyMMdd-HHmmss"

# Where to look for the project. This is your Desktop — the script checks it,
# the bloom-app folder on it, and also tries to follow OneDrive to the real
# Desktop folder in case OneDrive is redirecting it. Override any time with:
#     $env:BLOOM_DESKTOP = "D:\somewhere"
$DesktopDefault = "C:\Users\Windows 11 Pro\OneDrive\Desktop"

function Say  ($m) { Write-Host "`n$m" -ForegroundColor White }
function Ok   ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host $m -ForegroundColor Yellow }
function Die  ($m) { Write-Host $m -ForegroundColor Red; exit 1 }

function Test-Project ($p) {
  return (Test-Path (Join-Path $p "package.json")) -and (Test-Path (Join-Path $p "src\routes\rewards.tsx"))
}

# ------------------------------------------------------------- find project --
$Desktop = if ($env:BLOOM_DESKTOP) { $env:BLOOM_DESKTOP } else { $DesktopDefault }

$Searched = New-Object System.Collections.Generic.List[string]
$Target = if ($args.Count -ge 1) { $args[0] } else { $null }

if (-not $Target) {
  $candidates = New-Object System.Collections.Generic.List[string]

  # 1. Your Desktop, and the project folder on it.
  if ($Desktop) {
    $candidates.Add((Join-Path $Desktop "bloom-app"))
    $candidates.Add($Desktop)
    $candidates.Add((Join-Path $Desktop "Bloom"))
  }

  # 2. Right where this folder was extracted.
  $candidates.Add((Join-Path $Here "bloom-app"))
  $candidates.Add($Here)

  # 3. Beside it, walking up a few levels — the common case when the kit is
  #    extracted onto the Desktop and the project is already there.
  foreach ($base in @($Here, (Get-Location).Path)) {
    $dir = $base
    for ($i = 0; $i -lt 3; $i++) {
      $parent = Split-Path $dir -Parent
      if (-not $parent -or $parent -eq $dir) { break }
      $candidates.Add((Join-Path $parent "bloom-app"))
      $candidates.Add($parent)
      $dir = $parent
    }
  }

  # 4. Where you are standing.
  $candidates.Add((Get-Location).Path)
  $candidates.Add((Join-Path (Get-Location).Path "bloom-app"))

  # 5. Whatever Windows itself calls the Desktop (OneDrive can redirect it).
  $real = [Environment]::GetFolderPath("Desktop")
  if ($real) { $candidates.Add((Join-Path $real "bloom-app")) }

  foreach ($c in $candidates) {
    if (-not $c) { continue }
    $Searched.Add($c)
    if (Test-Project $c) { $Target = (Resolve-Path $c).Path; break }
  }
}

if ($Target -and -not (Test-Project $Target)) {
  Die "That folder is not a Bloom project (no package.json / src/routes/rewards.tsx): $Target"
}

# ------------------------------------------------------------ clone if new --
if (-not $Target) {
  Warn "No Bloom project found. Looked in:"
  foreach ($c in $Searched) { Write-Host "   $c" }

  # Clone where it is easiest to find again: the Desktop if we can write to it,
  # otherwise right here.
  $cloneInto = if ($Desktop -and (Test-Path $Desktop -PathType Container)) {
    Join-Path $Desktop "bloom-app"
  } else {
    Join-Path $Here "bloom-app"
  }

  $reply = Read-Host "`nClone Bloom into $cloneInto and continue? [Y/n]"
  if ($reply -notmatch '^[nN]') {
    Say "Cloning $Branch"
    git clone --branch $Branch --single-branch $Repo $cloneInto
    if ($LASTEXITCODE -ne 0) { Die "git clone failed. Check your internet and that git is installed." }
    $Target = $cloneInto
    Ok "Cloned to $Target"
  } else {
    Die "Stopped. Re-run with your project path:  powershell -File apply.ps1 `"C:\path\to\bloom-app`""
  }
}

Say "Bloom project: $Target"

# --------------------------------------------------------------- back up ----
$Backup = Join-Path $Here "backup-$Stamp"
Say "Backing up anything that is about to change -> backup-$Stamp"
$count = 0
foreach ($file in Get-ChildItem -Path $Files -Recurse -File) {
  $rel = $file.FullName.Substring($Files.Length + 1)
  $dest = Join-Path $Target $rel
  if (Test-Path $dest) {
    $bdir = Join-Path $Backup (Split-Path $rel -Parent)
    New-Item -ItemType Directory -Force -Path $bdir | Out-Null
    Copy-Item $dest (Join-Path $Backup $rel)
    $count++
  }
}
Ok "$count existing file(s) saved"

# ------------------------------------------------------------------ copy ----
Say "Installing the Rewards page"
$copied = 0
foreach ($file in Get-ChildItem -Path $Files -Recurse -File) {
  $rel = $file.FullName.Substring($Files.Length + 1)
  $dest = Join-Path $Target $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item $file.FullName $dest -Force
  $copied++
}
Ok "$copied file(s) in place"

# --------------------------------------------------------------- remove -----
if (Test-Path $Remove) {
  $removed = 0
  foreach ($rel in Get-Content $Remove) {
    if (-not $rel.Trim()) { continue }
    $dest = Join-Path $Target $rel
    if (Test-Path $dest) { Remove-Item $dest -Force; $removed++ }
  }
  if ($removed -gt 0) { Ok "$removed old shop file(s) removed" }
}

# ---------------------------------------------------------------- deps ------
# npm and tsc write routine notices to stderr; with ErrorActionPreference=Stop
# PowerShell 5.1 would treat those as fatal. We check exit codes ourselves.
$ErrorActionPreference = "Continue"
Set-Location $Target
if (-not (Test-Path "node_modules")) {
  Say "Installing dependencies (this can take a minute)"
  npm install
  if ($LASTEXITCODE -ne 0) { Die "npm install failed. Fix that, then run this again." }
} else {
  Ok "Dependencies already installed"
}

# --------------------------------------------------------------- verify -----
if (Test-Path "node_modules\.bin\tsc.cmd") {
  Say "Checking the code compiles"
  $out = & node_modules\.bin\tsc.cmd --noEmit 2>&1 |
    Select-String -NotMatch "BloomCycleAI|ReflectSheet|usePeriodLog|cycle-classic"
  if ($out) { Warn "TypeScript reported issues above. The app may still run." } else { Ok "No type errors in the Rewards feature" }
}

# ------------------------------------------------------------------ next ----
Say "Done"
Write-Host "  Rewards page files are in: $Target"
Write-Host "  Backup of replaced files:  $Backup"
Write-Host "`n  Start it with: npm run dev   (then open /rewards)`n"

$start = Read-Host "Start the app now? [Y/n]"
if ($start -notmatch '^[nN]') {
  npm run dev
} else {
  Write-Host "  When you are ready:  cd `"$Target`"; npm run dev"
}
