import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface ChunkCache {
	has(key: string): boolean;
	get(key: string): Interfaces.IBlockData[];
	set(key: string, data: Interfaces.IBlockData[]): void;
	remove(key: string): void;
}
