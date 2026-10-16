$ErrorActionPreference = 'Stop'
$env:PORT = '4175'
$keyPointer = [IntPtr]::Zero
$serverProcess = $null
try {
    $keySecure = Read-Host 'Paste a newly generated ElevenLabs API key' -AsSecureString
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
    $env:ELEVENLABS_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    $env:ELEVENLABS_VOICE_ID = Read-Host 'ElevenLabs Voice ID (from your voice settings)'
    if ([string]::IsNullOrWhiteSpace($env:ELEVENLABS_VOICE_ID)) { throw 'Voice ID is required.' }
    $nodeCommand = Get-Command node -ErrorAction Stop
    $serverPath = Join-Path $PSScriptRoot 'engi-match-local-server.mjs'
    $serverProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList @(('"' + $serverPath + '"')) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:4175/api/health' -TimeoutSec 1
            if ($health.ok) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw 'The local server did not start. Port 4175 may already be in use.' }
    Start-Process 'http://127.0.0.1:4175/'
    Write-Host 'Engi Match is open. Keep this window open; press Enter here to stop the local server.'
    Read-Host | Out-Null
}
catch {
    Write-Host "Could not start Engi Match: $_" -ForegroundColor Red
    if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
    Read-Host 'Press Enter to close'
}
finally {
    if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
    Remove-Item Env:ELEVENLABS_API_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:ELEVENLABS_VOICE_ID -ErrorAction SilentlyContinue
    Remove-Item Env:PORT -ErrorAction SilentlyContinue
}
