import { Contracts } from "@mainsail/contracts";

let mockBlock: Partial<Contracts.Crypto.Block> | undefined;
let lastHeight = 0;

export const setBlock = (block: Partial<Contracts.Crypto.Block> | undefined) => {
	mockBlock = block;
};

export const setLastHeight = (height: number) => {
	lastHeight = height;
};

class StateStoreMocks implements Partial<Contracts.State.StateStore> {
	public getLastBlock(): Contracts.Crypto.Block {
		return mockBlock as Contracts.Crypto.Block;
	}

	public getGenesisBlock(): Contracts.Crypto.CommittedBlock {
		return mockBlock as Contracts.Crypto.CommittedBlock;
	}

	public getLastHeight(): number {
		return lastHeight;
	}
}

export const instance = new StateStoreMocks();
