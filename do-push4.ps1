$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
$log = "c:\Users\USER\Desktop\My Dev Works\Penworld-school\push-log4.txt"
"=== CLEANUP TEMP FILES ===" | Set-Content $log -Encoding UTF8
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\do-push2.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\do-push3.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\push-log2.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school\push-log3.txt" -Force -ErrorAction SilentlyContinue
git add -A 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Remove temp push scripts" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== PUSH (120s timeout) ===" | Add-Content $log -Encoding UTF8
$job = Start-Job -ScriptBlock { Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"; git push -u origin master 2>&1 | Out-String }
$done = $job | Wait-Job -Timeout 120
if ($done) { Receive-Job $job 2>&1 | Out-String | Add-Content $log -Encoding UTF8 } else { "PUSH TIMED OUT after 120s." | Add-Content $log -Encoding UTF8; Stop-Job $job -ErrorAction SilentlyContinue }
Remove-Job $job -Force -ErrorAction SilentlyContinue
"=== VERIFY ===" | Add-Content $log -Encoding UTF8
git log --oneline -4 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git ls-remote https://github.com/Lordrogba247/PenWorld-School.git HEAD 2>&1 | Out-String | Add-Content $log -Encoding UTF8
Write-Output "done4"
