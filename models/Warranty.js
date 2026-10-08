import mongoose from "mongoose";

// Default warranty-card template (pre-fills the form; fully editable per entry).
export const TEMPLATE = {
  covered: [
    "Manufacturing defects",
    "Hardware-related issues covered under warranty",
    "Product inspection by our service team",
    "Repair or replacement of eligible defective products according to the applicable product warranty terms.",
  ],
  notCovered: [
    "Damage caused after delivery by misuse, accidents or improper handling.",
    "Screen or body damage caused by impact or pressure after delivery.",
    "Liquid damage, unless expressly covered by the product warranty.",
    "Faults caused by unauthorized repairs or modifications.",
  ],
  claimSteps: [
    "Contact customer support and provide your Order ID/Invoice Number.",
    "Provide the product and necessary accessories for inspection.",
    "Our service team will inspect the product.",
    "Warranty service will be provided according to the applicable warranty policy.",
  ],
  refundNote:
    "Where a warranty-related refund is approved, we will initiate the refund within 3–5 working days of approval. The time taken for the amount to appear in your account may depend on the payment provider. Any applicable mandatory refund deadline will take precedence.",
  supportPhone: "+8809678833626",
  supportEmail: "support.policy1@gmail.com",
};

const warrantySchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true },
    purchaseDate: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    warrantyEndDate: { type: Date, required: true }, // warranty valid until this date
    imageUrl: { type: String },
    note: { type: String, trim: true },

    // Editable warranty-card template (defaults to TEMPLATE above).
    covered: { type: [String], default: () => TEMPLATE.covered },
    notCovered: { type: [String], default: () => TEMPLATE.notCovered },
    claimSteps: { type: [String], default: () => TEMPLATE.claimSteps },
    refundNote: { type: String, default: TEMPLATE.refundNote },
    supportPhone: { type: String, default: TEMPLATE.supportPhone },
    supportEmail: { type: String, default: TEMPLATE.supportEmail },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes — speed up the sorted pagination and search lookups at scale.
warrantySchema.index({ createdAt: -1 }); // record-creation order
warrantySchema.index({ purchaseDate: -1 }); // list sort + date-range filter
warrantySchema.index({ customerName: 1 });
warrantySchema.index({ customerPhone: 1 });
// orderId already has a unique index from the field definition.

export default mongoose.model("Warranty", warrantySchema);
