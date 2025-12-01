import type { Contracts } from "@mainsail/contracts";

let mockBlock: Partial<Contracts.Crypto.Block> | undefined;
let lastHeight = 0;

class StoreMocks implements Partial<Contracts.State.Store> {
	public getLastBlock(): Contracts.Crypto.Block {
		return mockBlock as Contracts.Crypto.Block;
	}

	public getGenesisCommit(): Contracts.Crypto.Commit {
		return mockBlock as Contracts.Crypto.Commit;
	}

	public getLastHeight(): number {
		return lastHeight;
	}
}

export const setBlock = (block: Partial<Contracts.Crypto.Block> | undefined): void => {
	mockBlock = block;
};

export const setLastHeight = (height: number): void => {
	lastHeight = height;
};

export const instance = new StoreMocks();
