import { Blockchain } from "@arkecosystem/core-blockchain";
import { Contracts } from "@arkecosystem/core-contracts";

let mockBlock: Partial<Contracts.Crypto.IBlock> | undefined;
let mockIsSynced = true;

export const setBlock = (block: Partial<Contracts.Crypto.IBlock> | undefined) => {
	mockBlock = block;
};

export const setIsSynced = (isSynced: boolean) => {
	mockIsSynced = isSynced;
};

class BlockchainMock implements Partial<Blockchain> {
	public getLastBlock(): Contracts.Crypto.IBlock {
		return mockBlock as Contracts.Crypto.IBlock;
	}

	public getLastHeight(): number {
		return mockBlock?.data ? mockBlock.data.height : 1;
	}

	public isSynced(block?: any): boolean {
		return mockIsSynced;
	}

	public async removeBlocks(nblocks: number): Promise<void> {}
}

export const instance = new BlockchainMock();
