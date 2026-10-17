$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
$log = "c:\Users\USER\Desktop\My Dev Works\Penworld-school\final-fix-log.txt"
"=== START $(Get-Date -Format o) ===" | Set-Content $log -Encoding UTF8
"--- strip BOM from package-lock.json ---" | Add-Content $log -Encoding UTF8
$bytes = [System.IO.File]::ReadAllBytes("c:\Users\USER\Desktop\My Dev Works\Penworld-school\package-lock.json")
"first 3 bytes: $($bytes[0]),$($bytes[1]),$($bytes[2])" | Add-Content $log -Encoding UTF8
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $new = New-Object byte[] ($bytes.Length - 3)
  [Array]::Copy($bytes, 3, $new, 0, $new.Length)
  [System.IO.File]::WriteAllBytes("c:\Users\USER\Desktop\My Dev Works\Penworld-school\package-lock.json", $new)
  "BOM stripped from package-lock.json" | Add-Content $log -Encoding UTF8
} else { "no BOM in package-lock.json" | Add-Content $log -Encoding UTF8
}
"--- validate both JSONs ---" | Add-Content $log -Encoding UTF8
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
node -e "JSON.parse(require('fs').readFileSync('package-lock.json','utf8')); console.log('package-lock.json OK')" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- cleanup temp files ---" | Add-Content $log -Encoding UTF8
Remove-Item -Force resolve-conflict.ps1, resolve-log.txt -ErrorAction SilentlyContinue
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git add -A 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Fix Vercel build: strip BOM from package-lock.json" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- push ---" | Add-Content $log -Encoding UTF8
$job = Start-Job -ScriptBlock { Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"; git push origin master 2>&1 | Out-String }
$done = $job | Wait-Job -Timeout 120
if ($done) { Receive-Job $job 2>&1 | Out-String | Add-Content $log -Encoding UTF8 } else { "PUSH TIMED OUT" | Add-Content $log -Encoding UTF8; Stop-Job $job -ErrorAction SilentlyContinue }
Remove-Job $job -Force -ErrorAction SilentlyContinue
"--- final state ---" | Add-Content $log -Encoding UTF8
git log --oneline -4 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== END ===" | Add-Content $log -Encoding UTF8
