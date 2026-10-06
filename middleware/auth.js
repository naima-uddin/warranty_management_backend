import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT and attach the live user document to req.user.
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select("-password");
    if (!user || !user.active)
      return res.status(401).json({ message: "Account disabled or not found" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Only allow admins.
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin access required" });
  next();
};

// Require a specific permission (admins always pass).
export const require = (perm) => (req, res, next) => {
  if (!req.user.can(perm))
    return res.status(403).json({ message: "Permission denied" });
  next();
};
