$ErrorActionPreference = 'Stop'
$env:PORT = '4175'
Write-Host 'Starting Engi Match locally. Open http://127.0.0.1:4175/ in your browser.'
Write-Host 'Keep this PowerShell window open while using the site. Press Ctrl+C to stop.'
try {
    $nodeCommand = Get-Command node -ErrorAction Stop
    & $nodeCommand.Source (Join-Path $PSScriptRoot 'engi-match-local-server.mjs')
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Node server exited with code $LASTEXITCODE." -ForegroundColor Red
        Read-Host 'Copy the error above, then press Enter to close'
    }
}
catch {
    Write-Host "Could not start the local server: $_" -ForegroundColor Red
    Read-Host 'Copy the error above, then press Enter to close'
}
finally {
    Remove-Item Env:PORT -ErrorAction SilentlyContinue
}
