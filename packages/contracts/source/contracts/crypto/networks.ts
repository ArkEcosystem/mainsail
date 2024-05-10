import { Fees } from "../fees.js";
import { CommitJson } from "./commit.js";

export type NetworkConfig = {
	genesisBlock: CommitJson;
	milestones: Milestone[];
	network: Network;
};

export type NetworkConfigPartial = {
	genesisBlock: CommitJson;
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
	blockPrepareTime: number;
	epoch: string;
	fees: Fees;
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

export type MilestoneDiff = { [key in MilestoneKey]?: string };

export type MilestoneSearchResult<T> = {
	found: boolean;
	height: number;
	data: T | null;
};
