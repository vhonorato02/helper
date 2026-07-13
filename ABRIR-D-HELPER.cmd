@echo off
if not exist "D:\helper" (
  echo D:\helper nao foi encontrado.
  pause
  exit /b 1
)
start "" explorer "D:\helper"
