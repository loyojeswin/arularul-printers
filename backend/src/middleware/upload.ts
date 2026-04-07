import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeBaseName(fileName: string) {
  const ext = path.extname(fileName);
  return path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-");
}

function ensureDir(relativePath: string) {
  const dir = path.join(uploadDir, relativePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function createStorage(relativePath = "") {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureDir(relativePath)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = sanitizeBaseName(file.originalname);
      cb(null, `${Date.now()}-${baseName}${ext}`);
    }
  });
}

const allowedMime = new Set(["application/pdf", "image/jpeg", "image/png"]);
const mediaMimePrefix = ["image/", "video/"];
const imageMimePrefix = ["image/"];

export const upload = multer({
  storage: createStorage(),
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG files are allowed"));
    }
    return cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 }
});

export const orderDesignUpload = multer({
  storage: createStorage("orders"),
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG files are allowed"));
    }
    return cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024, files: 30 }
});

export const productMediaUpload = multer({
  storage: createStorage("products"),
  fileFilter: (_req, file, cb) => {
    if (!mediaMimePrefix.some((prefix) => file.mimetype.startsWith(prefix))) {
      return cb(new Error("Only image and video files are allowed"));
    }
    return cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024, files: 10 }
});

export const offerImageUpload = multer({
  storage: createStorage("offers"),
  fileFilter: (_req, file, cb) => {
    if (!imageMimePrefix.some((prefix) => file.mimetype.startsWith(prefix))) {
      return cb(new Error("Only image files are allowed"));
    }
    return cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});
