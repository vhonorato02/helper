$ErrorActionPreference = "Continue"

$Project = "D:\helper"
$RoutineDir = "D:\helper\.codex-routines"
$LogDir = "D:\helper\.codex-routines\logs"
$LockPath = "D:\helper\.codex-routines\locks\06-health-fix.lock"
$PromptPath = "D:\helper\.codex-routines\06-health-fix.md"
$Codex = "C:\Users\Anglo\AppData\Local\OpenAI\Codex\bin\716dda49c14d31a0\codex.exe"

Set-Location $Project

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "$LogDir\06-health-fix-$Stamp.log"

New-Item -ItemType Directory -Force $LogDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $LockPath) | Out-Null

function Write-Log($Text) {
  $Text | Tee-Object -FilePath $LogFile -Append
}

Write-Log "==== Helper Codex Routine: 06-health-fix ===="
Write-Log "Started: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Log "Project: $Project"
Write-Log "Codex: $Codex"
Write-Log ""

if (Test-Path $LockPath) {
  $LockAge = (Get-Date) - (Get-Item $LockPath).LastWriteTime
  if ($LockAge.TotalHours -lt 5) {
    Write-Log "Another routine appears to be running. Lock: $LockPath"
    Write-Log "Lock age hours: $([Math]::Round($LockAge.TotalHours, 2))"
    Write-Log "Exiting to avoid overlap."
    exit 0
  } else {
    Write-Log "Stale lock found. Removing."
    Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
  }
}

New-Item -ItemType File -Force $LockPath | Out-Null

try {
  if (-not (Test-Path $PromptPath)) {
    Write-Log "Prompt not found: $PromptPath"
    exit 1
  }

  $Prompt = Get-Content $PromptPath -Raw

  Write-Log "Running Codex..."
  Write-Log ""

  & $Codex exec --sandbox danger-full-access $Prompt 2>&1 | Tee-Object -FilePath $LogFile -Append
  $ExitCode = $LASTEXITCODE

  Write-Log ""
  Write-Log "Finished: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
  Write-Log "ExitCode: $ExitCode"

  exit $ExitCode
}
catch {
  Write-Log ""
  Write-Log "EXCEPTION:"
  Write-Log $_.Exception.Message
  exit 1
}
finally {
  Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
}