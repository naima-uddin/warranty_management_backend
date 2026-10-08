import { Router } from "express";
import multer from "multer";
import Warranty from "../models/Warranty.js";
import { protect, require as requirePerm } from "../middleware/auth.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const router = Router();

// Max 5 MB uploads. Image type is enforced by the frontend (accept="image/*")
// and by Cloudinary, which only stores valid images.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Run multer and surface size-limit errors as a clean 400.
const uploadImage = (req, res, next) =>
  upload.single("image")(req, res, (err) => {
    if (err) {
      req.resume();
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "Image must be 5 MB or smaller"
          : err.message;
      return res.status(400).json({ message: msg });
    }
    next();
  });

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

// Escape regex special chars so search input (e.g. "+1 (929)") can't break the query.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/warranties?q=&page=1  — paginated list / search (15 per page)
router.get("/", requirePerm("warranty:view"), async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = q
      ? (() => {
          const rx = new RegExp(escapeRegex(q), "i");
          return {
            $or: [
              { orderId: rx },
              { customerName: rx },
              { customerPhone: rx },
            ],
          };
        })()
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

    res.json({
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/warranties/:id
router.get("/:id", requirePerm("warranty:view"), async (req, res) => {
  try {
    const item = await Warranty.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

// POST /api/warranties — create (image optional)
router.post(
  "/",
  requirePerm("warranty:create"),
  uploadImage,
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
  uploadImage,
  async (req, res) => {
    try {
      const data = { ...parseLists(req.body) };
      if (req.file) {
        data.imageUrl = await uploadToCloudinary(req.file.buffer);
      } else if (data.removeImage === "true") {
        data.imageUrl = ""; // user cleared the existing image
      }
      delete data.removeImage;
      const item = await Warranty.findByIdAndUpdate(req.params.id, data, {
        returnDocument: "after",
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
  try {
    const item = await Warranty.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;
