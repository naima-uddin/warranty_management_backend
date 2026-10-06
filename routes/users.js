import { Router } from "express";
import User, { PERMISSIONS } from "../models/User.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

// All routes here are admin-only.
router.use(protect, adminOnly);

// GET /api/users  — list moderators (+ the available permission list)
router.get("/", async (_req, res) => {
  const users = await User.find({ role: "moderator" })
    .select("-password")
    .sort("-createdAt");
  res.json({ users, permissions: PERMISSIONS });
});

// POST /api/users — create a moderator
router.post("/", async (req, res) => {
  try {
    const { name, email, password, permissions = [] } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      role: "moderator",
      permissions: permissions.filter((p) => PERMISSIONS.includes(p)),
    });
    res.status(201).json({ ...user.toObject(), password: undefined });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/users/:id — edit moderator (name, permissions, active, optional password)
router.put("/:id", async (req, res) => {
  try {
    const { name, permissions, active, password } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: "moderator" });
    if (!user) return res.status(404).json({ message: "Moderator not found" });

    if (name !== undefined) user.name = name;
    if (active !== undefined) user.active = active;
    if (permissions !== undefined)
      user.permissions = permissions.filter((p) => PERMISSIONS.includes(p));
    if (password) user.password = password;

    await user.save();
    res.json({ ...user.toObject(), password: undefined });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  const user = await User.findOneAndDelete({
    _id: req.params.id,
    role: "moderator",
  });
  if (!user) return res.status(404).json({ message: "Moderator not found" });
  res.json({ message: "Deleted" });
});

export default router;
