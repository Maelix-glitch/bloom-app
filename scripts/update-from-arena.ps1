# Bloom — pull the latest Rewards progression work from the Arena branch.
#
# Run this from inside your local clone, in the VS Code terminal:
#
#     powershell -ExecutionPolicy Bypass -File scripts/update-from-arena.ps1
#
# It is deliberately careful: it will not throw away work you have not saved.
# Nothing here touches your database or your .env — this is code only.

$ErrorActionPreference = "Stop"

$Branch = "arena/01a087e8-bloom-app"
$Remote = "origin"

function Say  ($m) { Write-Host "`n$m" -ForegroundColor White }
function Warn ($m) { Write-Host $m -ForegroundColor Yellow }

if (-not (Test-Path ".git")) {
  Warn "This does not look like a git repo."
  Write-Host "Open the folder that contains bloom-app, then run this again."
  exit 1
}

$Stashed = $false
if (git status --porcelain) {
  Warn "You have uncommitted changes:"
  git status --short
  $reply = Read-Host "`nStash them, pull, then restore them? [y/N]"
  if ($reply -match '^[yY]') {
    git stash push -u -m "before arena pull $(Get-Date -Format 'yyyy-MM-dd-HHmm')"
    $Stashed = $true
  } else {
    Write-Host "Stopped. Commit or stash your work, then run this again."
    exit 1
  }
}

Say "Fetching $Remote"
git fetch $Remote $Branch

Say "Switching to $Branch"
$exists = git show-ref --verify --quiet "refs/heads/$Branch"; $code = $LASTEXITCODE
if ($code -eq 0) {
  git checkout $Branch
} else {
  git checkout -b $Branch --track "$Remote/$Branch"
}

Say "Pulling the latest"
git pull --ff-only $Remote $Branch

if ($Stashed) {
  Say "Restoring your changes"
  git stash pop
}

if (Test-Path "package.json") {
  Say "Installing dependencies"
  npm install
}

Say "Done"
git --no-pager log --oneline -5
Write-Host "`nStart the app with:  npm run dev"
Write-Host "Then check /rewards — that is the journey page."
