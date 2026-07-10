import { AppDataSource } from "../database/data-source";
import { Upload } from "../database/entities/Upload";

type CreateUploadInput = {
  postcode: string;
  volume?: number | null;
  revenue?: number | null;
  category?: string | null;
  datasetId: number;
};

export class UploadService {
  private repository = AppDataSource.getRepository(Upload);
  async bulkCreate(inputs: CreateUploadInput[]): Promise<Upload[]> {
    if (inputs.length === 0) {
      return [];
    }

    return this.repository.save([]);
  }
}
