import fs from "fs";
import path from "path";
import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, Response, Router } from "express";
import { UploadController } from "../controllers/upload.controller";

const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;

class InvalidCsvFileError extends Error {
  constructor() {
    super("Only CSV files are accepted");
    this.name = "InvalidCsvFileError";
  }
}

const router = Router();
const uploadDir = path.resolve(process.cwd(), "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const csvUpload = multer({
  limits: {
    fileSize: MAX_CSV_FILE_SIZE_BYTES,
  },
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
    if (extension !== ".csv") {
      cb(new InvalidCsvFileError());
      return;
    }

    cb(null, true);
  },
});

const uploadSingleCsv = (req: Request, res: Response, next: NextFunction) => {
  csvUpload.single("file")(req, res, (error: unknown) => {
    if (error instanceof InvalidCsvFileError) {
      res.status(415).json({
        message: error.message,
      });
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: "CSV file must be 5 MB or smaller",
      });
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

router.post("/bulk", uploadSingleCsv, UploadController.bulkCreate);

export default router;
