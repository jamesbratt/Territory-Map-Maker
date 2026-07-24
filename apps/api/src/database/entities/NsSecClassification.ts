import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_NS_SEC_CLASSIFICATION_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_NS_SEC_CLASSIFICATION_DATE", ["date"])
@Entity({ name: "ns_sec_classification" })
export class NsSecClassification extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "total_residents" })
  totalResidents!: number;

  @Column({ type: "int", name: "higher_managerial_professional" })
  higherManagerialProfessional!: number;

  @Column({ type: "int", name: "lower_managerial_professional" })
  lowerManagerialProfessional!: number;

  @Column({ type: "int", name: "intermediate_occupations" })
  intermediateOccupations!: number;

  @Column({ type: "int", name: "small_employers_own_account" })
  smallEmployersOwnAccount!: number;

  @Column({ type: "int", name: "lower_supervisory_technical" })
  lowerSupervisoryTechnical!: number;

  @Column({ type: "int", name: "semi_routine_occupations" })
  semiRoutineOccupations!: number;

  @Column({ type: "int", name: "routine_occupations" })
  routineOccupations!: number;

  @Column({ type: "int", name: "never_worked_long_term_unemployed" })
  neverWorkedLongTermUnemployed!: number;

  @Column({ type: "int", name: "full_time_students" })
  fullTimeStudents!: number;
}
