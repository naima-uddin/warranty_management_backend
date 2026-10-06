import { Router } from "express";
import multer from "multer";
import Warranty from "../models/Warranty.js";
import { protect, require as requirePerm } from "../middleware/auth.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// GET /api/warranties?q=searchTerm  — list / search by Order ID or customer name
router.get("/", requirePerm("warranty:view"), async (req, res) => {
  const q = req.query.q?.trim();
  const filter = q
    ? {
        $or: [
          { orderId: new RegExp(q, "i") },
          { customerName: new RegExp(q, "i") },
          { customerPhone: new RegExp(q, "i") },
        ],
      }
    : {};
  const items = await Warranty.find(filter).sort("-createdAt").limit(200);
  res.json(items);
});

// GET /api/warranties/:id
router.get("/:id", requirePerm("warranty:view"), async (req, res) => {
  const item = await Warranty.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// POST /api/warranties — create (image optional)
router.post(
  "/",
  requirePerm("warranty:create"),
  upload.single("image"),
  async (req, res) => {
    try {
      const data = { ...req.body, createdBy: req.user._id };
      if (req.file) data.imageUrl = await uploadToCloudinary(req.file.buffer);
      const item = await Warranty.create(data);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// PUT /api/warranties/:id — edit (new image optional)
router.put(
  "/:id",
  requirePerm("warranty:edit"),
  upload.single("image"),
  async (req, res) => {
    try {
      const data = { ...req.body };
      if (req.file) data.imageUrl = await uploadToCloudinary(req.file.buffer);
      const item = await Warranty.findByIdAndUpdate(req.params.id, data, {
        new: true,
        runValidators: true,
      });
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// DELETE /api/warranties/:id
router.delete("/:id", requirePerm("warranty:delete"), async (req, res) => {
  const item = await Warranty.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export default router;
