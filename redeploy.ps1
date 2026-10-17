$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
$log = "c:\Users\USER\Desktop\My Dev Works\Penworld-school\redeploy-log.txt"
"=== START $(Get-Date -Format o) ===" | Set-Content $log -Encoding UTF8
"--- validate package.json ---" | Add-Content $log -Encoding UTF8
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- status ---" | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git add -A 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Fix Vercel build: clean package.json leading whitespace" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- push ---" | Add-Content $log -Encoding UTF8
$job = Start-Job -ScriptBlock { Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"; git push origin master 2>&1 | Out-String }
$done = $job | Wait-Job -Timeout 120
if ($done) { Receive-Job $job 2>&1 | Out-String | Add-Content $log -Encoding UTF8 } else { "PUSH TIMED OUT" | Add-Content $log -Encoding UTF8; Stop-Job $job -ErrorAction SilentlyContinue }
Remove-Job $job -Force -ErrorAction SilentlyContinue
"--- final ---" | Add-Content $log -Encoding UTF8
git log --oneline -3 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== END ===" | Add-Content $log -Encoding UTF8
