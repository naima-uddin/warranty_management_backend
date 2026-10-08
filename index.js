import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import warrantyRoutes from "./routes/warranties.js";

// Fail fast if critical env vars are missing (clearer than a cryptic runtime error).
const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn("⚠️  Cloudinary not configured — image uploads will fail.");
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "Warranty API running" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/warranties", warrantyRoutes);

// JSON 404 for unknown API routes
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler — always respond with JSON, never an HTML stack page
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
});
