import { Router } from "express";
import uploadRoutes from "./upload.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/upload", uploadRoutes);

export default router;
