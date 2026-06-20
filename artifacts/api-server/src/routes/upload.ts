import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadFile } from "../lib/storage.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const MAX_SIZE_MB = parseInt(process.env["MAX_UPLOAD_SIZE_MB"] ?? "25");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "video/mp4", "video/quicktime", "video/x-matroska", "video/avi",
      "audio/mpeg", "audio/ogg", "audio/webm", "audio/wav", "audio/aac", "audio/x-m4a",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip", "application/x-zip-compressed",
      "application/x-rar-compressed",
      "text/plain", "text/csv",
      "application/json",
      "application/octet-stream",
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("audio/") || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

function getFile(req: Request): Express.Multer.File | undefined {
  return (req as Request & { file?: Express.Multer.File }).file;
}

async function handleUploadRoute(req: AuthRequest, res: Response, folder: string) {
  try {
    const file = getFile(req);
    if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const url = await uploadFile(file.buffer, file.originalname, file.mimetype, folder);
    res.json({ url, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e && typeof e === "object" && "status" in e) {
      res.status(e.status as number).json({ error: e.message, code: e.code });
      return;
    }
    logger.error({ err }, "Upload error");
    res.status(500).json({ error: "Upload failed" });
  }
}

router.post("/avatar", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "avatars")
);

router.post("/message-media", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "messages")
);

router.post("/post-media", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "posts")
);

router.post("/story-media", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "stories")
);

router.post("/voice", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "voice")
);

router.post("/files", requireAuth, upload.single("file"), (req: Request, res: Response) =>
  handleUploadRoute(req as AuthRequest, res, "files")
);

export default router;
