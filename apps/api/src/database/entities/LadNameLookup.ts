import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "lad_name_lookup" })
export class LadNameLookup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 150 })
  lad25cd!: string;

  @Column({ type: "varchar", length: 150 })
  lad25nm!: string;
}
