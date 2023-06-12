import { Contracts } from "@mainsail/contracts";
import { Stores } from "@mainsail/state";

let mockBlock: Partial<Contracts.Crypto.IBlock> | undefined;
let lastHeight = 0;

export const setBlock = (block: Partial<Contracts.Crypto.IBlock> | undefined) => {
	mockBlock = block;
};

export const setLastHeight = (height: number) => {
	lastHeight = height;
};

class StateStoreMocks implements Partial<Stores.StateStore> {
	public getLastBlock(): Contracts.Crypto.IBlock {
		return mockBlock as Contracts.Crypto.IBlock;
	}

	public getGenesisBlock(): Contracts.Crypto.ICommittedBlock {
		return mockBlock as Contracts.Crypto.ICommittedBlock;
	}

	public getLastHeight(): number {
		return lastHeight;
	}
}

export const instance = new StateStoreMocks();
