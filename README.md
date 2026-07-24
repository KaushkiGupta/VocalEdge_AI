# VocalEdge AI — AI Communication Coach & Mock Interview Hub

VocalEdge AI is an all-in-one platform designed to help users improve their communication, presentation, and interview skills using Artificial Intelligence.

## Core Features
1. **Interactive Speech Coach**: Speak verbally into your microphone. VocalEdge AI transcribes in real-time, monitors speaking pace (words-per-minute), identifies filler words ("like", "basically", "um"), corrects grammar errors with inline highlighted comparisons, and lists constructive actionable suggestions.
2. **AI Mock Interview Room**: Experience realistic, adaptive behavioral and technical interviews. The AI generates follow-up questions tailored to your resume, job role target, and current answers. Conducts dynamic voice responses and converts questions to professional audio speech synthesis (TTS).
3. **Webcam Presentation Coach**: Practice pitches or speeches. Toggle your live webcam stream, load slide decks, and read from a scrolling teleprompter console with adjustable scrolling speeds.
4. **ATS Resume Scanner**: Upload your resume (PDF/TXT) and audit keyword density, grammatical errors, and action metrics. Receive specific recommended bullet rewrites to beat scanning algorithms.
5. **Gamification Dashboard**: Track streaks (flame rewards), XP gains, user levels, and badges unlocked ("Consistent", "Communicator", "First Steps") over history sessions.

---

## Technical Stack
* **Frontend**: React + Vite (Custom Vanilla CSS design system, dark-mode slate/violet scheme).
* **Backend**: Node.js + Express (Local JSON database persistence or PostgreSQL via Prisma, text extraction).
* **AI & Speech Providers**:
  - **Text Generation**: Groq (`llama-3.3-70b-versatile`)
  - **Speech-to-Text**: Groq Whisper (`whisper-large-v3`)
  - **Text-to-Speech**: OpenAI (`tts-1`) or ElevenLabs

---

## Getting Started

### 1. Configure the Server
1. Navigate to the `server` folder:
   ```bash
   cd server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Copy `server/.env.example` to `server/.env` and fill in the required keys:
   ```bash
   cp .env.example .env
   ```
   **Required Env Vars:**
   - `PORT`: Port for the server (default: `5000`)
   - `JWT_SECRET`: Secret key for signing JSON Web Tokens
   - `CLIENT_ORIGIN`: URL of the frontend (default: `http://localhost:5173`)
   - `GROQ_API_KEY`: API Key for Groq (provides text generation and Whisper Speech-to-Text)

   **Optional Env Vars:**
   - `DATABASE_URL`: PostgreSQL connection URL (e.g., `postgresql://user:pass@host:5432/dbname`). If omitted, the server automatically defaults to the local JSON database fallback (`server/db/db.json`).
   - `OPENAI_API_KEY` / `ELEVENLABS_API_KEY`: API keys for Text-to-Speech.
   - `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`: API keys for real-time WebRTC support.

4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   The backend will listen on `http://localhost:5000`.

### 2. Configure the Client
1. Navigate to the `client` folder:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Click the link printed in your terminal (usually `http://localhost:5173`) to launch the platform in your browser.

---

## Database Modes
- **JSON Fallback Mode**: If `DATABASE_URL` is not specified, the system stores all data in a local JSON file: `server/db/db.json`. This mode features per-user isolation and is ideal for quick, single-machine local development.
- **PostgreSQL Mode**: If `DATABASE_URL` is set, the server connects to PostgreSQL via Prisma. Before using Postgres, run the Prisma generation:
  ```bash
  npx prisma generate
  ```

---

## Running the Test Suite
To run the server unit and integration tests:
```bash
cd server
npm test
```

