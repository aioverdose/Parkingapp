Write-Host "=== Running full production build check ===" -ForegroundColor Cyan
Write-Host ""

$result = & npx next build 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "`n=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host "`nFix the errors above, then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Build passed! ===" -ForegroundColor Green
Write-Host "`nNow deploy with:" -ForegroundColor Cyan
Write-Host "npx vercel --prod --yes" -ForegroundColor White
