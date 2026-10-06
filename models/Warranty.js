import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true },
    purchaseDate: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    warrantyPeriod: { type: String, required: true, trim: true }, // e.g. "7 calendar days from the delivery date."
    imageUrl: { type: String },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Warranty", warrantySchema);
