import fs from "fs";
import path from "path";
import multer, { FileFilterCallback } from "multer";
import { Router } from "express";
import { UploadController } from "../controllers/upload.controller";

const router = Router();
const uploadDir = path.resolve(process.cwd(), "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const csvUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (
      _req,
      file,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, extension === ".csv");
  },
});

router.post("/bulk", csvUpload.single("file"), UploadController.bulkCreate);

export default router;
