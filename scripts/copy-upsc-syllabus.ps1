$src = 'C:\Users\vikas\Downloads'
$dst = 'D:\ASI24\Frontend\src\data'
$files = @(
  'upsc_social_justice.json',
  'upsc_internal_security.json',
  'upsc_post_independence.json',
  'upsc_disaster_management.json',
  'upsc_art_culture.json'
)
foreach ($f in $files) {
  Copy-Item -Path (Join-Path $src $f) -Destination (Join-Path $dst $f) -Force
  Write-Output "$f -> $(Join-Path $dst $f)"
}
