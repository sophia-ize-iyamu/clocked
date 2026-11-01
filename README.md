# Clocked

LARP as anyone. An AI interviewer tries to clock you in 45 seconds.

## Overview

- Pick a role or a famous person, and Tock, a speaking orb with props for the part, questions you.
- Hold Space to answer. Each answer moves a live "clocked" meter, and at 60% you're clocked on the spot.
- After the round you hear a spoken verdict, read a bluff report, and can get an emailed offer or rejection that you negotiate by reply.
- Tick, the stopwatch mascot, answers questions about the game on the page, with no AI calls.

## Stack

- **ElevenLabs Agents:** the voice interviewer, a client tool that moves the meter, and post-call analysis for the report.
- **Agentboxd:** the recruiter's inbox.
- **Gemini (free tier) or Featherless:** the backup interviewer. If ElevenLabs can't take a call, a text model runs Tock, and the browser speaks the questions and transcribes the answers.
- **Render:** hosting.
- **Three.js:** Tock, the orb that pulses as it speaks.

## Setup

1. `npm install`
2. Set `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `AGENTBOXD_API_KEY` and `AGENTBOXD_INBOX_ID` as environment variables. For the backup interviewer, also set `GEMINI_API_KEY` (free at aistudio.google.com) or `FEATHERLESS_API_KEY`. `BACKUP_MODEL` optionally overrides the model.
3. `npm start`, then open `http://localhost:3000`.

Create the interviewer agent once with `node scripts/create-agent.mjs` (needs `ELEVENLABS_API_KEY`), and push prompt changes with `node scripts/update-agent.mjs`.

## Limitations

- Scores come from the interviewer model's judgement and can be wrong, most often on niche roles.
- Hold-to-answer is needed in loud rooms; the background voice filter helps but doesn't catch everything.
- Round and email limits live in memory, so they reset when the server restarts.
- The backup interviewer relies on the browser's speech recognition, which works in Chrome and Edge but not every browser.
- Built solo in 1 day at LarpHacks 2026 by Sophia Ize-Iyamu.
