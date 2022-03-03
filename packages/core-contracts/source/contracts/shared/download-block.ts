import { IBlockData } from "../crypto";

export interface DownloadBlock extends Omit<IBlockData, "transactions"> {
	transactions: string[];
}
