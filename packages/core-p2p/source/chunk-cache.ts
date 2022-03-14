import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

interface ChunkData {
	key: string;
	data: Contracts.Crypto.IBlockData[];
}

@injectable()
export class ChunkCache implements Contracts.P2P.ChunkCache {
	#downloadedChunksCache: ChunkData[] = [];

	#downloadedChunksCacheMax = 100;

	public has(key: string): boolean {
		return this.#downloadedChunksCache.some((chunkData) => chunkData.key === key);
	}

	public get(key: string): Contracts.Crypto.IBlockData[] {
		const chunkData = this.#downloadedChunksCache.find((chunkData) => chunkData.key === key);

		if (!chunkData) {
			throw new Error(`Downloaded chunk for key ${key} is not defined.`);
		}

		return chunkData.data;
	}

	public set(key: string, data: Contracts.Crypto.IBlockData[]): void {
		this.#downloadedChunksCache.push({
			data: data,
			key: key,
		});

		if (this.#downloadedChunksCache.length > this.#downloadedChunksCacheMax) {
			this.#downloadedChunksCache.shift();
		}
	}

	public remove(key: string): void {
		this.#downloadedChunksCache = this.#downloadedChunksCache.filter((chunkData) => chunkData.key !== key);
	}
}
