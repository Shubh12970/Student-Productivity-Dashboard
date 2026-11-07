import taskRoutes from "./routes/taskRoutes";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header) and configured frontends.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);
app.use(express.json());

app.use("/api/tasks", taskRoutes);
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "StudyFlow API is running",
  });
});

// Both local dev (tsx/node) and the Workers entry (worker.ts via
// httpServerHandler) expect the app to listen on PORT.
app.listen(PORT, () => {
  console.log(`StudyFlow API listening on port ${PORT}`);
});
