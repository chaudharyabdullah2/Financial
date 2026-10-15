# Starts the FastAPI backend (port 8000) and the Next.js frontend (port 3000).
# Usage:  .\start.ps1          (development, hot reload)
#         .\start.ps1 -Prod    (production build)
param([switch]$Prod)

$root = $PSScriptRoot

if (-not (Test-Path "$root\models\sentiment_model.joblib")) {
    Write-Host "No trained model found - running train.py first..." -ForegroundColor Yellow
    python "$root\train.py"
}
if (-not (Test-Path "$root\web\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm --prefix "$root\web" install
}

$api = Start-Process python -ArgumentList "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $root -PassThru -NoNewWindow

try {
    Set-Location "$root\web"
    if ($Prod) {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
        npm run start
    } else {
        npm run dev
    }
} finally {
    Stop-Process -Id $api.Id -ErrorAction SilentlyContinue
    Set-Location $root
}
