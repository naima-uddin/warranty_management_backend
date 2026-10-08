// One-off: reset the admin password to the current ADMIN_PASSWORD in .env.
// Usage: node utils/resetAdmin.js
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

await mongoose.connect(process.env.MONGO_URI);
const admin = await User.findOne({ role: "admin" });
if (!admin) {
  console.log("No admin found — start the server once to seed it.");
} else {
  admin.email = process.env.ADMIN_EMAIL || admin.email;
  admin.password = process.env.ADMIN_PASSWORD; // re-hashed by pre-save hook
  await admin.save();
  console.log(`✅ Admin password reset for ${admin.email}`);
}
await mongoose.disconnect();
