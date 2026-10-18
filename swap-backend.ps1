$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"
$log = "c:\Users\USER\Desktop\My Dev Works\Penworld-school\swap-log.txt"
"=== START $(Get-Date -Format o) ===" | Set-Content $log -Encoding UTF8
$old = 'https://pen-world-school.vercel.app'
$new = 'https://penworld-demo-school-backend.vercel.app'
$exts = @('*.js','*.jsx','*.ts','*.tsx','*.css','*.html','*.json','*.md')
$files = Get-ChildItem -Path "c:\Users\USER\Desktop\My Dev Works\Penworld-school" -Recurse -File -Include $exts | Where-Object { $_.FullName -notmatch 'node_modules|\.git\\|dist\\' }
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$count = 0
foreach ($f in $files) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  if ($t.Contains($old)) {
    $t2 = $t.Replace($old, $new)
    [System.IO.File]::WriteAllText($f.FullName, $t2, $utf8NoBom)
    $count++
    "$($f.FullName)" | Add-Content $log -Encoding UTF8
  }
}
"replaced in $count files" | Add-Content $log -Encoding UTF8
"--- validate JSONs ---" | Add-Content $log -Encoding UTF8
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
node -e "JSON.parse(require('fs').readFileSync('package-lock.json','utf8')); console.log('package-lock.json OK')" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- check BOM absent ---" | Add-Content $log -Encoding UTF8
$b1 = [System.IO.File]::ReadAllBytes("c:\Users\USER\Desktop\My Dev Works\Penworld-school\package.json")
$b2 = [System.IO.File]::ReadAllBytes("c:\Users\USER\Desktop\My Dev Works\Penworld-school\package-lock.json")
"package.json first3: $($b1[0]),$($b1[1]),$($b1[2])" | Add-Content $log -Encoding UTF8
"package-lock first3: $($b2[0]),$($b2[1]),$($b2[2])" | Add-Content $log -Encoding UTF8
"--- git add+commit ---" | Add-Content $log -Encoding UTF8
git add -A 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git -c user.name="Lordrogba247" -c user.email="Lordrogba247@users.noreply.github.com" commit -m "Point all APIs to penworld-demo-school-backend" 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"--- push ---" | Add-Content $log -Encoding UTF8
$job = Start-Job -ScriptBlock { Set-Location "c:\Users\USER\Desktop\My Dev Works\Penworld-school"; git push origin master 2>&1 | Out-String }
$done = $job | Wait-Job -Timeout 120
if ($done) { Receive-Job $job 2>&1 | Out-String | Add-Content $log -Encoding UTF8 } else { "PUSH TIMED OUT" | Add-Content $log -Encoding UTF8; Stop-Job $job -ErrorAction SilentlyContinue }
Remove-Job $job -Force -ErrorAction SilentlyContinue
"--- final ---" | Add-Content $log -Encoding UTF8
git log --oneline -3 2>&1 | Out-String | Add-Content $log -Encoding UTF8
git status --short 2>&1 | Out-String | Add-Content $log -Encoding UTF8
"=== END ===" | Add-Content $log -Encoding UTF8
