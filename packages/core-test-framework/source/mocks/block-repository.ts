import { Repositories } from "../../../core-database";

export type ValidatorForgedBlock = {
	generatorPublicKey: string;
	totalRewards: string;
	totalFees: string;
	totalProduced: number;
};
export type LastForgedBlock = { id: string; height: string; generatorPublicKey: string; timestamp: number };

let mockValidatorsForgedBlocks: ValidatorForgedBlock[] = [];
let mockLastForgedBlocks: LastForgedBlock[] = [];

export const setValidatorForgedBlocks = (blocks: ValidatorForgedBlock[]) => {
	mockValidatorsForgedBlocks = blocks;
};

export const setLastForgedBlocks = (blocks: LastForgedBlock[]) => {
	mockLastForgedBlocks = blocks;
};

class BlockRepositoryMock implements Partial<Repositories.BlockRepository> {
	public async getValidatorsForgedBlocks() {
		return mockValidatorsForgedBlocks;
	}

	public async getLastForgedBlocks() {
		return mockLastForgedBlocks;
	}
}

export const instance = new BlockRepositoryMock();
