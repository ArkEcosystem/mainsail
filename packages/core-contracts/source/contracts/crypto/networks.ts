import { IBlockJson } from "./block";

export interface NetworkConfig {
	genesisBlock: IBlockJson;
	milestones: Array<Record<string, any>>;
	network: Network;
}

export interface Network {
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
}

export interface MilestoneSearchResult {
	found: boolean;
	height: number;
	data: any;
}
