import { Column, Entity, PrimaryGeneratedColumn, Index } from "typeorm";

@Index("IDX_UPLOAD_PCD7", ["pcd7"])
@Entity({ name: "postcodelookup" })
export class PostcodeLookup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 150 })
  pcd7!: string;

  @Column({ type: "varchar", length: 150 })
  lad25cd!: string;

  @Column({ type: "varchar", length: 150 })
  wd25cd!: string;

  @Column({ type: "varchar", length: 150 })
  lat!: string;

  @Column({ type: "varchar", length: 150 })
  long!: string;

  @Column({ type: "varchar", length: 150 })
  lsoa21cd!: string;
}
