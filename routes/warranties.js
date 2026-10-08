import { Router } from "express";
import multer from "multer";
import Warranty from "../models/Warranty.js";
import { protect, require as requirePerm } from "../middleware/auth.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// List fields arrive as JSON strings from the multipart form — parse them.
const parseLists = (body) => {
  for (const key of ["covered", "notCovered", "claimSteps"]) {
    if (typeof body[key] === "string") {
      try {
        body[key] = JSON.parse(body[key]);
      } catch {
        /* leave as-is */
      }
    }
  }
  return body;
};

router.use(protect);

// GET /api/warranties?q=&page=1  — paginated list / search (15 per page)
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

  const limit = 15;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  const [items, total] = await Promise.all([
    Warranty.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit),
    Warranty.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
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
      const data = { ...parseLists(req.body), createdBy: req.user._id };
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
      const data = { ...parseLists(req.body) };
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
