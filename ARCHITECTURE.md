# VocalEdge AI — Architecture Documentation

This document describes the key architectural decisions and details of VocalEdge AI.

## AI & Speech Integration
- **LLM Engine**: Groq's `llama-3.3-70b-versatile` is selected as the default model due to its ultra-low response latency and high output token throughput, making it optimal for interactive chat, feedback loops, and interview question generation.
- **Modularity**: The integration is isolated inside [groqClient.js](file:///c:/Users/Shreyansh/OneDrive/Desktop/VocalEdge_AI/server/lib/groqClient.js), allowing other models or providers to be swapped in easily.
- **Speech Stack**:
  - **Speech-to-Text**: Handled via Groq Whisper (`whisper-large-v3`) inside [audioService.js](file:///c:/Users/Shreyansh/OneDrive/Desktop/VocalEdge_AI/server/lib/audioService.js).
  - **Text-to-Speech**: Handled via OpenAI (`tts-1`) or ElevenLabs inside [audioService.js](file:///c:/Users/Shreyansh/OneDrive/Desktop/VocalEdge_AI/server/lib/audioService.js).

## Database Architecture
VocalEdge AI implements a dual-mode database strategy:
1. **JSON Fallback Mode**: Designed for local development. If no `DATABASE_URL` is configured, the server defaults to a local file database (`server/db/db.json`). This mode provides per-user isolation.
2. **PostgreSQL Mode**: Uses Prisma client connected to a PostgreSQL database.

> [!IMPORTANT]
> The Prisma schema includes index and cleanup changes (added indexes on `userId`/`interviewId`/`questionId` foreign keys, removed the unused `ModelAnswer` model) that have not yet been applied via a migration, because no `DATABASE_URL` has been configured in this environment. Before deploying against a real Postgres database, run `npx prisma migrate dev --name add_indexes_and_cleanup` and commit the generated migration folder.

## Authentication & Security
- **JWT Authentication**: Handles state verification using JSON Web Tokens. The tokens are extracted either from the HTTP `Authorization: Bearer <token>` header or a secure `token` cookie.
- **CSRF Protection**: Non-idempotent mutating HTTP requests (POST, PUT, DELETE, PATCH) are passed through the `csrfCheck` middleware in [auth.js](file:///c:/Users/Shreyansh/OneDrive/Desktop/VocalEdge_AI/server/middleware/auth.js), which validates the presence of the `X-Requested-With` header to prevent cross-site request forgery attacks.

## LLM Cost Estimation
- **Groq Pricing (llama-3.3-70b-versatile)**: Approximately **$0.59 per 1M input tokens** and **$0.79 per 1M output tokens**.
- **Typical Cost per Request**: A typical prompt size is ~1,500 input tokens (resume context, instructions, past dialogue) with a response of ~500 output tokens.
  - Input: `1500 * $0.00000059 = $0.000885`
  - Output: `500 * $0.00000079 = $0.000395`
  - Total: **~$0.00128 per typical request**.
- **Production Recommendation**: Actual costs vary based on average resume size and interview length; these metrics should be measured directly via token usage tracking in production.
