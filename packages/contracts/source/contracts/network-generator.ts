export type EnvironmentOptions = {
	coreDBHost: string;
	coreDBPort: number;
	coreDBUsername?: string;
	coreDBPassword?: string;
	coreDBDatabase?: string;

	coreP2PPort: number;
};

export type MilestoneOptions = {
	validators: number;
	validatorRegistrationFee: string;
	maxBlockPayload: number;
	maxBlockGasLimit: number;
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
	nethashSalt?: number;
};

export type RewardOptions = {
	rewardHeight: number;
	rewardAmount: string;
};

export type GenesisBlockOptions = {
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

		// Externally supplied secrets. When provided they are used verbatim instead of
		// generating random ones — required e.g. for a mainnet genesis built from
		// pre-generated validator keys. Each must be a valid BIP39 mnemonic.
		genesisMnemonic?: string;
		validatorMnemonics?: string[];

		// Testing
		createLegacyColdWallets?: boolean;
	};

export type Options = Partial<InternalOptions> & {
	network: string;
	token: string;
	symbol: string;
	chainId: number;
};
