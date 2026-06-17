$ErrorActionPreference = "Continue"

Set-Location "D:\helper"

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogDir = "D:\helper\.codex-routines\logs"
$PromptPath = "D:\helper\.codex-routines\00-deep-audit.md"
$Codex = "C:\Users\Anglo\AppData\Local\OpenAI\Codex\bin\716dda49c14d31a0\codex.exe"
$LogFile = "$LogDir\00-deep-audit-$Stamp.log"

New-Item -ItemType Directory -Force $LogDir | Out-Null

"==== Helper Codex Routine: 00-deep-audit ====" | Tee-Object -FilePath $LogFile -Append
"Started: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" | Tee-Object -FilePath $LogFile -Append
"Project: D:\helper" | Tee-Object -FilePath $LogFile -Append
"Codex: $Codex" | Tee-Object -FilePath $LogFile -Append
"" | Tee-Object -FilePath $LogFile -Append

if (-not (Test-Path $PromptPath)) {
  "Prompt não encontrado: $PromptPath" | Tee-Object -FilePath $LogFile -Append
  exit 1
}

$Prompt = Get-Content $PromptPath -Raw

try {
  & $Codex exec --sandbox danger-full-access $Prompt 2>&1 | Tee-Object -FilePath $LogFile -Append
  $ExitCode = $LASTEXITCODE
} catch {
  "EXCEPTION:" | Tee-Object -FilePath $LogFile -Append
  $_.Exception.Message | Tee-Object -FilePath $LogFile -Append
  $ExitCode = 1
}

"" | Tee-Object -FilePath $LogFile -Append
"Finished: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" | Tee-Object -FilePath $LogFile -Append
"ExitCode: $ExitCode" | Tee-Object -FilePath $LogFile -Append

exit $ExitCode
