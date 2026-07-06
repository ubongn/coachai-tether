param()

$ErrorActionPreference = 'Stop'

$Root = Join-Path $PSScriptRoot '..'
Push-Location $Root

try {
    Write-Host '🧪 Starting CoachAI demo stack...'

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker is not available. Please install Docker Desktop.'
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'npm is not available. Please install Node.js LTS.'
    }

    Write-Host '🐳 docker compose up (detached)...'
    & docker compose up --build -d

    Write-Host '📦 Installing frontend deps...'
    Push-Location (Join-Path $Root 'frontend')
    try {
        if (-not (Test-Path node_modules)) {
            & npm install | Out-Null
        }
    }
    finally {
        Pop-Location
    }

    Write-Host ''
    Write-Host '✅ CoachAI is starting.'
    Write-Host '   Frontend: http://localhost:3000'
    Write-Host '   Backend:  http://localhost:8000'
    Write-Host '   API docs: http://localhost:8000/docs'
}
finally {
    Pop-Location
}
