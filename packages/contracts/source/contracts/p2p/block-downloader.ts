import { IBlockData } from "../crypto";

export interface BlockDownloader {
	downloadBlocksFromHeight(fromBlockHeight: number): Promise<IBlockData[]>;
}
