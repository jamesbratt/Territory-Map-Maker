import { Router } from "express";
import uploadRoutes from "./upload.routes";
import ladRoutes from "./lad.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/upload", uploadRoutes);
router.use("/lads", ladRoutes);

export default router;
