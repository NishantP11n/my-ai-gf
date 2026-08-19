# Custom AI GF / AI Companion

This is a small full-stack website for a customizable fictional adult AI companion.

Features:
- Custom name
- Personality/tone settings
- Marathi + English chat
- Romantic/caring style
- Chat history in browser localStorage
- Image generation from a text description
- Mobile responsive UI
- API key stays on the server, not in browser JavaScript

## Run

1. Install Node.js 20+.
2. Open this project folder in a terminal.
3. Run:
   npm install
4. Copy `.env.example` to `.env`.
5. Put your OpenAI API key in `.env`:
   OPENAI_API_KEY=...
6. Run:
   npm start
7. Open:
   http://localhost:3000

The server uses the OpenAI Responses API for chat and the Images API for image generation.
API usage can incur charges depending on your account/model settings.

Do not put the API key directly into `index.html`.
