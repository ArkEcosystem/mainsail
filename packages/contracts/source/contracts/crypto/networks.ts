import { ICommittedBlockJson } from "./block";

export type NetworkConfig = {
	genesisBlock: ICommittedBlockJson;
	milestones: Milestone[];
	network: Network;
};

export type NetworkConfigPartial = {
	genesisBlock: ICommittedBlockJson;
	milestones: MilestonePartial[];
	network: Network;
};

export type Network = {
	name: string;
	messagePrefix: string;
	pubKeyHash: number;
	nethash: string;
	wif: number;
	slip44: number;
	client: {
		token: string;
		symbol: string;
		explorer: string;
	};
};

export type MilestoneBlock = {
	maxPayload: number;
	maxTransactions: number;
	version: number;
};
export type MilestoneSatoshi = {
	decimals: number;
	denomination: number;
};

export type Milestone = {
	height: number;
	activeValidators: number;
	address: Record<string, any>;
	block: MilestoneBlock;
	blockTime: number;
	epoch: string;
	multiPaymentLimit: number;
	reward: string;
	satoshi: MilestoneSatoshi;
	vendorFieldLength: number;
	stageTimeout: number;
	stageTimeoutIncrease: number;
};

export type MilestonePartial = Partial<Milestone> & {
	height: number;
};

export type MilestoneKey = keyof Milestone;

export type MilestoneSearchResult<T> = {
	found: boolean;
	height: number;
	data: T | null;
};
