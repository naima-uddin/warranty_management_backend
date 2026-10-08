import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  permissions: u.permissions,
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !user.active || !(await user.comparePassword(password || "")))
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({ token: sign(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed, please try again" });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => res.json(publicUser(req.user)));

export default router;
