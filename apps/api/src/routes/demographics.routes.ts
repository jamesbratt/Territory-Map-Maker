import { Router } from 'express';
import { DistrictInputError, getDistrictAgePopulation, validateDistricts } from '../services/district-demographics.service';
import { CENSUS_SIGNALS, getDistrictSignal } from '../services/census-signals.service';

const router = Router();
router.get('/signals', (_req, res) => {
  res.json(CENSUS_SIGNALS.map(({ key, label, geography, unit, totalLabel, aggregation }) => ({ key, label, geography, unit, totalLabel, aggregation })));
});
router.post('/districts', async (req, res, next) => {
  try {
    const districts = validateDistricts(req.body?.districts);
    res.json(await getDistrictSignal(districts, req.query.signal ?? 'population'));
  } catch (error) {
    if (error instanceof DistrictInputError) { res.status(400).json({ message: error.message }); return; }
    next(error);
  }
});
router.post('/districts/age', async (req, res, next) => {
  try {
    const districts = validateDistricts(req.body?.districts);
    res.json(await getDistrictAgePopulation(districts));
  } catch (error) {
    if (error instanceof DistrictInputError) { res.status(400).json({ message: error.message }); return; }
    next(error);
  }
});
export default router;
