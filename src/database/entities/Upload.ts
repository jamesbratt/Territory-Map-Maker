import { Entity, Column, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_UPLOAD_ID", ["id"])
@Index("IDX_UPLOAD_POSTCODE", ["postcode"])
@Index("IDX_UPLOAD_ID_POSTCODE", ["id", "postcode"])
@Entity({ name: "uploads" })
export class Upload extends BaseAppEntity {
  @Column()
  postcode!: string;
}
