import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { In } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { PostcodeLookup } from '../database/entities/Postcodelookup';
import { LocationCsvError, MAX_LOCATION_BYTES, matchLocations, postcodeCandidates, readLocationCsv } from '../services/location-upload.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOCATION_BYTES, files: 1, fields: 1 },
  fileFilter: (_req, file, done) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') return done(new LocationCsvError('Only CSV files are accepted'));
    done(null, true);
  },
}).single('file');

router.post('/upload', (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof LocationCsvError) { res.status(415).json({ message: error.message }); return; }
    if (error instanceof multer.MulterError) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'CSV file must be 5 MB or smaller' : 'Provide one CSV file and a postcode column header mapping' });
      return;
    }
    if (error) return next(error);
    next();
  });
}, async (req, res, next) => {
  if (!req.file) { res.status(400).json({ message: 'CSV file is required' }); return; }
  if (typeof req.body.postcode !== 'string' || !req.body.postcode.trim()) {
    res.status(400).json({ message: 'Request body must include postcode column header mapping' }); return;
  }
  try {
    const { rows, skipped } = await readLocationCsv(req.file.buffer, req.body.postcode.trim());
    const matches = await AppDataSource.getRepository(PostcodeLookup).find({
      select: { pcd7: true, lat: true, long: true },
      where: { pcd7: In(postcodeCandidates(rows.map((row) => row.postcode))) },
    });
    res.setHeader('X-Location-Rows-Skipped', String(skipped));
    res.setHeader('Access-Control-Expose-Headers', 'X-Location-Rows-Skipped');
    res.json(matchLocations(rows, matches));
  } catch (error) {
    if (error instanceof LocationCsvError) { res.status(400).json({ message: error.message }); return; }
    next(error);
  }
});
export default router;
