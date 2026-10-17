$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\do-push4.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\push-log4.txt" -Force -ErrorAction SilentlyContinue
git add -A 2>&1 | Out-String
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Remove temp push scripts" 2>&1 | Out-String
$job = Start-Job -ScriptBlock { Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"; git push origin master 2>&1 | Out-String }
$done = $job | Wait-Job -Timeout 120
if ($done) { Receive-Job $job 2>&1 | Out-String } else { "PUSH TIMED OUT" }
Remove-Job $job -Force -ErrorAction SilentlyContinue
git log --oneline -4 2>&1 | Out-String
git status --short 2>&1 | Out-String
git remote -v 2>&1 | Out-String
