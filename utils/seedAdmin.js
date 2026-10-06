import User from "../models/User.js";

// Create the first admin from env vars if no admin exists yet.
export const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const exists = await User.findOne({ role: "admin" });
  if (exists) return;

  await User.create({
    name: process.env.ADMIN_NAME || "Admin",
    email,
    password,
    role: "admin",
  });
  console.log(`✅ Admin seeded: ${email}`);
};
