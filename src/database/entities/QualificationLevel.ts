import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_QUALIFICATION_LEVEL_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_QUALIFICATION_LEVEL_DATE", ["date"])
@Entity({ name: "qualification_level" })
export class QualificationLevel extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "residents_16plus_total" })
  residents16plusTotal!: number;

  @Column({ type: "int", name: "no_qualifications" })
  noQualifications!: number;

  @Column({ type: "int", name: "qualification_level_1" })
  qualificationLevel1!: number;

  @Column({ type: "int", name: "qualification_level_2" })
  qualificationLevel2!: number;

  @Column({ type: "int" })
  apprenticeship!: number;

  @Column({ type: "int", name: "qualification_level_3" })
  qualificationLevel3!: number;

  @Column({ type: "int", name: "qualification_level_4_plus" })
  qualificationLevel4Plus!: number;

  @Column({ type: "int", name: "other_qualifications" })
  otherQualifications!: number;
}
