# ============================================================================
#  deploy.ps1 — Deploy "Kuis Petualangan Ceria" ke Vercel dalam satu perintah
#
#  Pemakaian:
#    npx vercel login                                   # sekali saja
#    .\deploy.ps1 -DatabaseUrl "postgresql://..."
#
#  Bila punya token Vercel (https://vercel.com/account/tokens):
#    .\deploy.ps1 -DatabaseUrl "postgresql://..." -Token "xxxxx"
#
#  Yang dilakukan skrip ini:
#    1. Cek login Vercel
#    2. Isi tabel + data awal database cloud (migrasi + seed)
#    3. Tautkan folder ini ke project Vercel
#    4. Pasang environment variable (DATABASE_URL, JWT, SESSION, NODE_ENV)
#    5. Deploy ke production
#    6. Cek /api/health pada URL hasil deploy
# ============================================================================

param(
  [string]$DatabaseUrl = "",
  [string]$Token = "",
  [string]$Project = "kuis-petualangan-ceria"
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not $DatabaseUrl) { $DatabaseUrl = $env:DATABASE_URL }
if (-not $DatabaseUrl) {
  Write-Host "DATABASE_URL belum diisi." -ForegroundColor Yellow
  Write-Host 'Contoh: .\deploy.ps1 -DatabaseUrl "postgresql://user:pass@host/db?sslmode=require"'
  exit 1
}

$global:VercelTokenArgs = @()
if ($Token) { $global:VercelTokenArgs = @("--token", $Token) }

function Invoke-Vercel {
  param([string[]]$Arguments)

  & npx --yes vercel@latest @Arguments @global:VercelTokenArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Perintah 'vercel $($Arguments -join ' ')' gagal (exit $LASTEXITCODE)."
  }
}

function New-Secret {
  return (& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
}

Write-Host ""
Write-Host "=== 1/6 Cek login Vercel ===" -ForegroundColor Cyan
& npx --yes vercel@latest whoami @global:VercelTokenArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Belum login. Jalankan dulu:  npx vercel login" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== 2/6 Menyiapkan database cloud ===" -ForegroundColor Cyan
$env:DATABASE_URL = $DatabaseUrl
& npm --prefix backend run db:init
if ($LASTEXITCODE -ne 0) { throw "Migrasi/seed gagal. Periksa connection string DATABASE_URL." }

Write-Host ""
Write-Host "=== 3/6 Menautkan project Vercel ===" -ForegroundColor Cyan
& npx --yes vercel@latest link --yes --project $Project @global:VercelTokenArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "  Project '$Project' belum ada, membuat project baru..." -ForegroundColor Yellow
  & npx --yes vercel@latest link --yes @global:VercelTokenArgs
  if ($LASTEXITCODE -ne 0) { throw "Gagal menautkan project Vercel." }
}

Write-Host ""
Write-Host "=== 4/6 Memasang environment variables ===" -ForegroundColor Cyan
$variables = [ordered]@{
  DATABASE_URL   = $DatabaseUrl
  JWT_SECRET     = (New-Secret)
  SESSION_SECRET = (New-Secret)
  NODE_ENV       = "production"
}

foreach ($name in $variables.Keys) {
  Write-Host "  - $name"
  & npx --yes vercel@latest env add $name production --value $variables[$name] --force --yes @global:VercelTokenArgs
  if ($LASTEXITCODE -ne 0) { throw "Gagal memasang environment variable $name." }
}

Write-Host ""
Write-Host "=== 5/6 Deploy ke production ===" -ForegroundColor Cyan
$deployOutput = & npx --yes vercel@latest deploy --prod --yes @global:VercelTokenArgs 2>&1
$deployOutput | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw "Deploy gagal (exit $LASTEXITCODE)." }

$deploymentUrl = ($deployOutput |
  Select-String -Pattern "https://[a-z0-9\-]+\.vercel\.app" |
  ForEach-Object { $_.Matches.Value } |
  Select-Object -First 1)

Write-Host ""
Write-Host "=== 6/6 Cek kesehatan API ===" -ForegroundColor Cyan
if ($deploymentUrl) {
  Write-Host "  URL: $deploymentUrl"
  for ($i = 1; $i -le 6; $i++) {
    try {
      $health = Invoke-RestMethod "$deploymentUrl/api/health" -TimeoutSec 25
      Write-Host "  /api/health -> $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
      break
    } catch {
      Write-Host "  Menunggu deployment siap ($i/6)..."
      Start-Sleep -Seconds 6
    }
  }
} else {
  Write-Host "  URL tidak terdeteksi otomatis — buka dashboard Vercel." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Selesai. Login guru: guru / guru123" -ForegroundColor Green
