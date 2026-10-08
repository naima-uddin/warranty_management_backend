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

// Parse a YYYY-MM-DD (or ISO) query value into a Date; ignore anything invalid.
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// How far back each quick range reaches, measured from "now".
const startOfRange = (range) => {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    default:
      return null; // "all" or unknown → no date filter
  }
};

// Allowed sort orders (maps the public value to a Mongoose sort spec).
// Sorts on purchaseDate — the date shown in the list — with _id as a stable
// tie-breaker so rows with the same purchase date keep a consistent order.
const SORTS = {
  newest: { purchaseDate: -1, _id: -1 },
  oldest: { purchaseDate: 1, _id: 1 },
};

// GET /api/warranties?q=&page=1&range=all&sort=newest  — paginated list / search (15 per page)
router.get("/", requirePerm("warranty:view"), async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const conditions = [];

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      conditions.push({
        $or: [{ orderId: rx }, { customerName: rx }, { customerPhone: rx }],
      });
    }

    // Date filter on purchaseDate. A custom from/to range (any date, any month)
    // takes precedence; otherwise fall back to a quick preset range.
    const dateFilter = {};
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (from) dateFilter.$gte = from;
    if (to) {
      // `to` is an inclusive day — extend it to the end of that day.
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }
    if (!from && !to) {
      const presetFrom = startOfRange(req.query.range);
      if (presetFrom) dateFilter.$gte = presetFrom;
    }
    if (Object.keys(dateFilter).length) {
      conditions.push({ purchaseDate: dateFilter });
    }

    const filter = conditions.length ? { $and: conditions } : {};
    const sort = SORTS[req.query.sort] || SORTS.newest;

    const limit = 15;
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const [items, total] = await Promise.all([
      Warranty.find(filter)
        .sort(sort)
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
