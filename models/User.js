import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Granular permissions an admin can grant to a moderator.
export const PERMISSIONS = [
  "warranty:create",
  "warranty:edit",
  "warranty:delete",
  "warranty:view",
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "moderator"], default: "moderator" },
    permissions: [{ type: String, enum: PERMISSIONS }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password whenever it changes.
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Admin implicitly has every permission.
userSchema.methods.can = function (perm) {
  return this.role === "admin" || this.permissions.includes(perm);
};

export default mongoose.model("User", userSchema);
