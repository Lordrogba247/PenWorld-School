@echo off
"C:\Program Files\nodejs\npm.cmd" run build
if errorlevel 1 (echo FAILED > build_done.flag) else (echo SUCCESS > build_done.flag)