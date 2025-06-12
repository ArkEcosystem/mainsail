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
	validatorRegistrationFee: string;
	maxBlockPayload: number;
	maxBlockGasLimit: number;
	maxTxPerBlock: number;
	blockTime: number;
	timeouts?: {
		blockPrepareTime: number;
		blockTime: number;
		stageTimeout: number;
		stageTimeoutIncrease: number;
		tolerance: number;
	};
	epoch: Date;
};

export type NetworkOptions = {
	network: string;
	token: string;
	symbol: string;
	explorer: string;
	pubKeyHash: number;
	wif: number;
	chainId: number;
};

export type RewardOptions = {
	rewardHeight: number;
	rewardAmount: string;
};

export type GenesisBlockOptions = {
	distribute: boolean;
	premine: string;
	chainId: number;
	epoch: Date;
	snapshot?: SnapshotOptions;
	initialBlockNumber: number;
	mockFakeValidatorBlsKeys?: boolean;
};

export type SnapshotOptions = {
	path: string;
	snapshotHash?: string;
	previousGenesisBlockHash?: string;
};

export type InternalOptions = EnvironmentOptions &
	MilestoneOptions &
	NetworkOptions &
	RewardOptions &
	GenesisBlockOptions & {
		// Peers
		peers: string[];

		// General
		packageName?: string;
		configPath?: string;
		overwriteConfig: boolean;
		force: boolean;
	};

export type Options = Partial<InternalOptions> & {
	network: string;
	token: string;
	symbol: string;
	chainId: number;
};

export type WriteOptions = {
	writeApp: boolean;
	writePeers: boolean;
	writeEnvironment: boolean;
	writeValidators: boolean;
	writeGenesisBlock: boolean;
	writeCrypto: boolean;
	writeSnapshot: boolean;
};
