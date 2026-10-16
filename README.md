# Engi Match Learning Planner

A single-page learning planner for Thai high-school and university engineering students. The repository includes the standalone HTML app, an optional local API server, and Windows launch scripts.

## Run the standalone app

Open `engi-match-learning-planner.html` in a modern browser. Features that require the API server will show an unavailable state when no backend is running.

## Run with the local API server

1. Install Node.js 20 or later.
2. Double-click `เปิดเว็บพร้อมเสียง-AI.bat`, or run `start-engi-match-local.ps1` from PowerShell.
3. Open `http://127.0.0.1:4175/` if it does not open automatically.

The local server hosts the app and provides the configured learning endpoints. See `graduate-career-api-contract.md` for the API contract.

## Optional ElevenLabs voice

Run `start-engi-match-with-elevenlabs.ps1`. It prompts for the ElevenLabs API key as a secure PowerShell input and for a voice ID. The key is passed to the local server through an environment variable and is not included in this repository or browser code. Use a newly generated key if the one previously shared in chat may have been exposed.

## Data and security notes

- Course history and some demo data are stored in the browser's local storage.
- The standalone HTML does not provide secure account authentication or multi-user cloud storage.
- Configure backend credentials only through environment variables or a deployment secret store. Never commit `.env` files, API keys, or personal data.
- Sample courses and company listings are marked as hypothetical in the UI.

## Files

- `engi-match-learning-planner.html` — app UI and client-side behavior.
- `engi-match-local-server.mjs` — optional local API proxy.
- `graduate-career-api-contract.md` — API routes and response expectations.
- `start-engi-match-local.ps1` / `เปิดเว็บพร้อมเสียง-AI.bat` — local launchers.
- `start-engi-match-with-elevenlabs.ps1` — optional voice setup with a secure key prompt.
