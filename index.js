import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import warrantyRoutes from "./routes/warranties.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "Warranty API running" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/warranties", warrantyRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
});
