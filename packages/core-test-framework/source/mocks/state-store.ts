import { Crypto } from "@arkecosystem/core-contracts";
import { Stores } from "@arkecosystem/core-state";

let mockBlock: Partial<Crypto.IBlock> | undefined;
let lastHeight = 0;

export const setBlock = (block: Partial<Crypto.IBlock> | undefined) => {
	mockBlock = block;
};

export const setLastHeight = (height: number) => {
	lastHeight = height;
};

class StateStoreMocks implements Partial<Stores.StateStore> {
	public getLastBlock(): Crypto.IBlock {
		return mockBlock as Crypto.IBlock;
	}

	public getGenesisBlock(): Crypto.IBlock {
		return mockBlock as Crypto.IBlock;
	}

	public getLastHeight(): number {
		return lastHeight;
	}
}

export const instance = new StateStoreMocks();
