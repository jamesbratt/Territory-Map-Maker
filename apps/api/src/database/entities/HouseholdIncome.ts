import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_HOUSEHOLD_INCOME_MSOA21CD", ["msoa21cd"], { unique: true })
@Entity({ name: "household_income" })
export class HouseholdIncome extends BaseAppEntity {
  @Column({ type: "varchar", length: 9 })
  msoa21cd!: string;

  @Column({ type: "double precision", name: "annual_income_before_costs" })
  annualIncomeBeforeCosts!: number;

  @Column({ type: "double precision", name: "annual_income_after_costs" })
  annualIncomeAfterCosts!: number;
}
