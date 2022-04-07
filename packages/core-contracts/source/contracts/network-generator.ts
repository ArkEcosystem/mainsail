export type EnvironmentOptions = {
	coreDBHost: string;
	coreDBPort: number;
	coreDBUsername?: string;
	coreDBPassword?: string;
	coreDBDatabase?: string;

	coreP2PPort: number;
	coreWebhooksPort: number;
};

export type MilestoneOptions = {
	validators: number;
	maxBlockPayload: number;
	maxTxPerBlock: number;
	blockTime: number;
	epoch: Date;
	vendorFieldLength: number;
};

export type NetworkOptions = {
	network: string;
	token: string;
	symbol: string;
	explorer: string;
	pubKeyHash: number;
	wif: number;
};

export type RewardOptions = {
	rewardHeight: number;
	rewardAmount: string;
};

export type GenesisBlockOptions = {
	distribute: boolean;
	premine: string;
	pubKeyHash: number;
	epoch: Date;
};

export type InternalOptions = EnvironmentOptions &
	MilestoneOptions &
	NetworkOptions &
	RewardOptions &
	GenesisBlockOptions & {
		// Peers
		peers: string[];

		// General
		configPath?: string;
		overwriteConfig: boolean;
		force: boolean;
	};

export type Options = Partial<InternalOptions> & {
	network: string;
	token: string;
	symbol: string;
};

export type WriteOptions = {
	writeApp: boolean;
	writePeers: boolean;
	writeEnvironment: boolean;
	writeValidators: boolean;
	writeGenesisBlock: boolean;
	writeCrypto: boolean;
};
