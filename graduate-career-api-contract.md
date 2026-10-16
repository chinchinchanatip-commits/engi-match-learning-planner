# Engi Match Graduate Career Tools — API Contract

The HTML frontend calls same-origin routes under `/api/graduate`. All routes must require an authenticated server session (`HttpOnly`, `Secure`, `SameSite` cookie), enforce ownership from the session identity, and never trust a user ID supplied by the browser. AI provider credentials stay server-side. AI responses must be parsed and schema-validated by the server; the browser also validates the response shapes it renders.

Every AI result must include the notice “AI-generated advice, please double-check.” The UI displays this notice on the relevant feature page.

## Learning planner, course library, and standalone AI Mentor

These routes power the learning flow. They must use the same authenticated session and ownership rules described above. Do not expose model credentials in the browser. Validate request and response schemas on the server, and return localized content for the requested `language` (`th`, `en`, or `zh`).

- `GET /api/learning/videos?institutionId={id}&level={high-school|university}&language={th|en|zh}` — response `{ courses: [{ id, title, courseId, courseName, duration, videoUrl }] }`. For high-school learners, `institutionId=high-school` and `level=high-school` returns core upper-secondary courses; for university learners, return only courses/videos for the chosen institution with `level=university`. The browser only embeds secure HTTPS video URLs from supported providers; other HTTPS URLs open as links.
- `GET /api/learning/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&language={th|en|zh}` — response `{ events: [{ id, date, title?, topic?, videoId?, videoTitle?, institutionName?, courseName? }] }`, scoped to the authenticated user.
- `POST /api/learning/calendar` — add a planned lesson/video. Accept `{ date, title?, level }` for a topic or `{ date, videoId, courseId, institutionId, level }` for a library video. Validate that referenced course/video belongs to the institution.
- `POST /api/learning/calendar/generate` — arrange course videos and study topics over the user's calendar using `{ role, goal, hoursPerWeek, weeks, institutionId, major, language }`; use `role=hs` for the upper-secondary curriculum and `role=uni` for institution-specific university plans. Return structured JSON such as `{ events: [...] }`; the browser reloads the calendar after generation.
- `POST /api/learning/mentor/chat` — request `{ message, context, role, language }`; response `{ answer: string }`. Treat context as untrusted user data, limit what profile/activity data is included, and keep each conversation private to its account. The UI shows the AI double-check notice with each answer.

The standalone Mentor is opened from a global launcher available to both high-school and university learners. It is outside both learning flows and returns users to the step where they opened it.

## 1. Skill Gap Radar

`POST /api/graduate/skill-gap`

Request: `{ major, targetRole, postings: string[], language }`. The UI limits postings to 3–20 pasted texts; it does not scrape websites.

Response: `{ skills: [{ name, category, frequency, learningFirst, project }] }`. Return the top requested skills with frequency counts. The frontend sorts by frequency, renders the top 10, computes a frequency-weighted match from checked skills, and lists unchecked skills in frequency order.

## 2. Proof Portfolio

- `POST /api/graduate/portfolio/bullets` — request includes title, role, tools, problem, work, result, metrics, links. Response `{ th: string[3..4], en: string[3..4] }`. Never invent metrics; use `[add metric]` where needed. The browser rejects output numbers absent from the user input.
- `POST /api/graduate/portfolio/projects` — multipart project fields and images; response `{ id }`.
- `POST /api/graduate/portfolio/share` — `{ projectId }`; response `{ url }` (HTTPS public link only after user action).
- `POST /api/graduate/portfolio/pdf` — `{ projectId }`; response `{ url }` for the generated PDF.
- `POST /api/graduate/portfolio/verify` — `{ projectId, email }`; send one-click verification link and issue the badge only after verifier confirmation.

## 3. Interview Coach

- `POST /api/graduate/interview/start` — `{ language, role, major, difficulty, skills }`; response `{ sessionId, question }`.
- `POST /api/graduate/interview/answer` — `{ sessionId, answer }`; response `{ feedback: { strengths: string[], improve: string, sampleAnswer: string }, nextQuestion?: string, summary?: { content, structure, clarity, language } }`. Summary scores are 0–100 and history is account-scoped.
- `GET /api/graduate/interview/history` — response `{ history: [...] }`.


## Interview Coach speech playback

- `POST /api/graduate/voice/speech` — request `{ text, language }`, where `language` is `th` or `en` and `text` is limited to 4,000 characters. Require the authenticated session, apply per-account rate limits, and return audio bytes with an `audio/mpeg` content type. The browser uses this route to read interview questions and AI feedback aloud.
- The server calls ElevenLabs `POST /v1/text-to-speech/{voice_id}` with `model_id=eleven_multilingual_v2`, the selected text, and the server-side `xi-api-key` header. Store `ELEVENLABS_API_KEY` and a configured `ELEVENLABS_VOICE_ID` in the deployment's secret manager/environment; never send the key to the browser or include it in this document. Validate language, text length, response status, and audio content type before returning audio. Do not log submitted text or credentials.
- The HTML currently contains the UI integration only. This workspace has no backend route; audio playback becomes live after the proxy is implemented and deployed.

## 4. Mini-Challenge

- `GET /api/graduate/challenges?major=&skill=` — response `{ challenges: [...] }`, statuses `Open`, `Submitted`, or `Reviewed`.
- `POST /api/graduate/challenges` — multipart challenge, rubric, and attachments.
- `POST /api/graduate/challenges/{id}/submissions` — multipart file/link and approach.
- `GET /api/graduate/challenges/company/submissions` — company-owned submissions.
- `POST /api/graduate/challenges/submissions/{id}/review` — `{ score, comment }`; a passing result should create a proof-of-work portfolio entry.
- `POST /api/graduate/challenges/{id}/report` — content report.

## Account data

`DELETE /api/graduate/account/data` deletes all data owned by the authenticated user, including plans, skills, projects, interview history, and submissions. Public portfolio data must also be removed or unshared.

## Current integration status

The delivered artifact is a standalone HTML file. It implements the mobile UI, form validation, state handling, client-side output validation, and calls these same-origin routes with credentials. This workspace contains no backend, database, account authentication, or AI proxy, so secure per-account storage and live AI workflows require implementing/deploying this contract before end-to-end acceptance can pass. No API key is included in the HTML.

## Job application with portfolio

- `POST /api/graduate/jobs/{jobId}/applications` — authenticated request `{ portfolioProjectId, coverLetter, language }`; response `{ applicationId, status: "Submitted" }`. The server must verify that the job is open and that the selected portfolio project belongs to the authenticated user. Share only that selected project with the employer for this application; do not make it publicly visible by default. Store the application under the account and return a localized confirmation.
- The current company listings and contact details are fictional demo cards. A deployment must not send applications for `demo-*` listings to real companies; return `{ applicationId, status: "DemoOnly" }` for a demo submission; the UI must state that it did not reach a real company. Replace the demo cards with real, authorized openings before enabling actual applications.
