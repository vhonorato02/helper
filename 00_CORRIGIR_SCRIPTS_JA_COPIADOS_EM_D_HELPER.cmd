@echo off
setlocal
title Corrigir scripts Helper Codex em D:\helper

echo.
echo Corrigindo ParserError dos scripts .ps1 em D:\helper...
echo.

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$files = Get-ChildItem 'D:\helper' -Filter '*_main.ps1' -ErrorAction SilentlyContinue; foreach ($f in $files) { $t = Get-Content $f.FullName -Raw; $t = $t -replace '\"\$CommitPrefix: \$RoutineTitle \$Timestamp\"', '\"${CommitPrefix}: $RoutineTitle $Timestamp\"'; $t = $t -replace '\"\$([A-Za-z_][A-Za-z0-9_]*):', '\"${$1}:'; Set-Content -Path $f.FullName -Value $t -Encoding UTF8 }; Write-Host ('Corrigidos: ' + $files.Count + ' arquivo(s).')"

echo.
echo Pronto. Agora abra novamente o CMD da rotina.
pause
