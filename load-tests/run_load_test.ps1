param(
    [int]$Users = 100,
    [string]$Target = "http://localhost:5000"
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "⚡ CodeArena k6 Concurrency & Load Testing Suite" -ForegroundColor Yellow
Write-Host "🎯 Target Endpoint: $Target" -ForegroundColor White
Write-Host "👥 Virtual Users (VUs): $Users" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan

$env:API_BASE_URL = $Target

if ($Users -eq 5 -or $Users -eq 10) {
    Write-Host "🚀 Running Quick Smoke Test ($Users VUs)..." -ForegroundColor Green
    k6 run smoke_test.js
} else {
    Write-Host "🚀 Running 100-Concurrent Users Assessment Test..." -ForegroundColor Green
    k6 run load_test_100_users.js
}
