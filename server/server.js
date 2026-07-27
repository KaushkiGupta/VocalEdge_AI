import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

// Middleware imports
import { csrfCheck } from "./middleware/auth.js";
import { errorHandler } from "./middleware/validation.js";

// Routes imports
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import practiceRoutes from "./routes/practice.js";
import interviewRoutes from "./routes/interview.js";
import rtcRoutes from "./routes/rtc.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter to prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per 10 minutes
  message: { error: "Too many authentication attempts, please try again after 10 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
if (!process.env.CLIENT_ORIGIN) {
  console.warn("WARNING: CLIENT_ORIGIN is not set, falling back to localhost — this WILL break login in production");
}

app.use(cookieParser());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(csrfCheck);

// Configure Helmet with CSP suitable for LiveKit WebRTC
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.groq.com", "https://api.openai.com", "https://api.elevenlabs.io", "wss://*.livekit.cloud", "https://*.livekit.cloud"],
        mediaSrc: ["'self'", "blob:", "https://*.livekit.cloud"],
      },
    },
  })
);

// ─── MOUNT ROUTERS ───────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/rtc", rtcRoutes);
app.use("/api", practiceRoutes);
app.use("/api", dashboardRoutes);

// Centralized error handler
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
let server;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`VocalEdge AI server running on http://localhost:${PORT}`);
    console.log(`CORS: allowing origin -> ${CLIENT_ORIGIN}`);
  });

  // Graceful shutdown to release ports immediately on nodemon restart / termination
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGUSR2", () => {
    server.close(() => {
      process.kill(process.pid, "SIGUSR2");
    });
  });
}

export default app;
