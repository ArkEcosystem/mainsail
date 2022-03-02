import { Blockchain } from "@arkecosystem/core-blockchain";
import { Crypto } from "@arkecosystem/core-contracts";

let mockBlock: Partial<Crypto.IBlock> | undefined;
let mockIsSynced = true;

export const setBlock = (block: Partial<Crypto.IBlock> | undefined) => {
	mockBlock = block;
};

export const setIsSynced = (isSynced: boolean) => {
	mockIsSynced = isSynced;
};

class BlockchainMock implements Partial<Blockchain> {
	public getLastBlock(): Crypto.IBlock {
		return mockBlock as Crypto.IBlock;
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
