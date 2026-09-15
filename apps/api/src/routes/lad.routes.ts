import { Router } from "express";
import { AppDataSource } from "../database/data-source";
import { LadNameLookup } from "../database/entities/LadNameLookup";
import { VALID_CENSUS_VARIABLES } from "../services/census.config";
import { postcodeQuery, PostcodeData, rankPostcodes } from "../services/ranking.service";

const router = Router();

router.get("/", async (req, res) => {
  const q = req.query.q ?? "";
  if (typeof q !== "string" || q.length > 150) {
    res.status(400).json({ message: "q must be a string of at most 150 characters" });
    return;
  }
  try {
    const lads = await AppDataSource.getRepository(LadNameLookup)
      .createQueryBuilder("lad")
      .select("lad.lad25cd", "code").addSelect("lad.lad25nm", "name")
      .distinct(true)
      .where("(lad.lad25nm ILIKE :q OR lad.lad25cd ILIKE :q)", {
        q: `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`,
      })
      .andWhere('EXISTS (SELECT 1 FROM postcodelookup p WHERE p.lad25cd = lad.lad25cd)')
      .orderBy("lad.lad25nm", "ASC").addOrderBy("lad.lad25cd", "ASC")
      .limit(30).getRawMany();
    res.json(lads);
  } catch {
    res.status(500).json({ message: "Failed to fetch local authority districts" });
  }
});

router.post("/:code/rank", async (req, res) => {
  const { censusVariables } = req.body ?? {};
  if (!Array.isArray(censusVariables) || censusVariables.length === 0 ||
      censusVariables.some(v => typeof v !== "string" || !VALID_CENSUS_VARIABLES.includes(v))) {
    res.status(400).json({ message: "censusVariables must be a non-empty array of valid census variables" });
    return;
  }
  try {
    const lad = await AppDataSource.getRepository(LadNameLookup).findOneBy({ lad25cd: req.params.code as string });
    if (!lad) {
      res.status(404).json({ message: "Local authority district not found" });
      return;
    }
    const postcodes = await postcodeQuery().where("postcode.lad25cd = :code", { code: lad.lad25cd })
      .distinct(true).orderBy("postcode.pcd7", "ASC").getRawMany<PostcodeData>();
    const rows = await rankPostcodes(postcodes.map(p => ({ postcode: p.pcd7, data: {} })), censusVariables, postcodes);
    rows.sort((a, b) => (b.segment_affinity_score ?? -1) - (a.segment_affinity_score ?? -1));
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to rank district postcodes" });
  }
});

export default router;
