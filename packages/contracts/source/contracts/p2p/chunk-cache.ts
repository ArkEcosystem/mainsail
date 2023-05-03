import { IBlockData } from "../crypto";

export interface ChunkCache {
	has(key: string): boolean;
	get(key: string): IBlockData[];
	set(key: string, data: IBlockData[]): void;
	remove(key: string): void;
}
