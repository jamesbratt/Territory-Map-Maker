import { Router } from 'express';
import path from 'node:path';
import uploadRoutes from './upload.routes';
import locationUploadRoutes from './location-upload.routes';
import demographicsRoutes from './demographics.routes';
const routes = Router();
routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.get('/boundaries', (_req, res, next) => {
  res.sendFile(path.resolve(__dirname, '../boundaries/pcdistricts.json'), (error) => {
    if (error) next(error);
  });
});
routes.use('/upload', uploadRoutes);
routes.use('/locations', locationUploadRoutes);
routes.use('/demographics', demographicsRoutes);
export default routes;
