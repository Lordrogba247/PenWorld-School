$ErrorActionPreference = 'Continue'
$root = "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
Set-Location $root
$log = Join-Path $root "push-log.txt"
"" | Set-Content $log -Encoding UTF8
"=== ASSETS ===" | Add-Content $log -Encoding UTF8
Get-ChildItem -Path "$root\src\assets" -File | Select-Object Name, Length | Out-String | Add-Content $log -Encoding UTF8
"=== CHECK PenWorldimage vs heroesimage ===" | Add-Content $log -Encoding UTF8
Test-Path "$root\src\assets\PenWorldimage.png" | Out-String | Add-Content $log -Encoding UTF8
Test-Path "$root\src\assets\heroesimage.png" | Out-String | Add-Content $log -Encoding UTF8
Test-Path "$root\src\assets\Heroesimage.png" | Out-String | Add-Content $log -Encoding UTF8
"=== GIT STATUS BEFORE ===" | Add-Content $log -Encoding UTF8
git status 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== REMOVING TEMP SCRIPTS ===" | Add-Content $log -Encoding UTF8
Remove-Item -Path (Join-Path $root "rename-heroes.ps1") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $root "fix-backend.ps1") -Force -ErrorAction SilentlyContinue
"=== GIT ADD ===" | Add-Content $log -Encoding UTF8
git add -A 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== GIT STATUS AFTER ADD ===" | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== COMMIT ===" | Add-Content $log -Encoding UTF8
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Rename school from Heroes to PenWorld" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== REMOTE BEFORE ===" | Add-Content $log -Encoding UTF8
git remote -v 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git remote remove origin 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git remote add origin https://github.com/Lordrogba247/PenWorld-School.git 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== REMOTE AFTER ===" | Add-Content $log -Encoding UTF8
git remote -v 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== PUSH ===" | Add-Content $log -Encoding UTF8
git push -u origin master 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== DONE ===" | Add-Content $log -Encoding UTF8
git log --oneline -3 2>&1 | Out-String | Add-Content $log -Encoding UTF8
Write-Output "script finished"
