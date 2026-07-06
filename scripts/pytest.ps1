param()

$ErrorActionPreference = 'Stop'

Push-Location (Join-Path $PSScriptRoot '..', 'backend')

try {
    python --version | Out-Null
}
catch {
    throw 'Python 3.10+ is required for backend tests.'
}

try {
    pip install -r requirements.txt | Out-Null
    pytest -q
}
finally {
    Pop-Location
}
