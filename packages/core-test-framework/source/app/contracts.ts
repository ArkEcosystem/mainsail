import { Crypto } from "@arkecosystem/core-contracts";
import { Application, Types } from "@arkecosystem/core-kernel";
import { Paths } from "env-paths";
import { interfaces } from "@arkecosystem/core-container";

export interface Wallet {
	address: string;
	passphrase: string;
	keys: Crypto.IKeyPair;
	username: string | undefined;
}

export interface CoreOptions {
	flags?: {
		token: string;
		network: string;
		env?: string;
		paths?: Paths;
	};
	plugins?: {
		options?: Record<string, Record<string, any>>;
	};
	peers?: Types.JsonObject;
	validators?: Types.JsonObject;
	environment?: Types.JsonObject;
	app?: Types.JsonObject;
}

export interface CryptoFlags {
	network: string;
	premine: string;
	validators: number;
	blocktime: number;
	maxTxPerBlock: number;
	maxBlockPayload: number;
	rewardHeight: number;
	rewardAmount: number;
	pubKeyHash: number;
	wif: number;
	token: string;
	symbol: string;
	explorer: string;
	distribute: boolean;
}

export interface CryptoOptions {
	flags: CryptoFlags;
	genesisBlock?: Types.JsonObject;
	milestones?: Types.JsonObject;
	network?: Types.JsonObject;
}

export interface SandboxOptions {
	core: CoreOptions;
	crypto: CryptoOptions;
}

export interface CoreConfigPaths {
	root: string;
	env: string;
	app: string;
	validators: string;
	peers: string;
}

export interface CryptoConfigPaths {
	root: string;
	genesisBlock: string;
	milestones: string;
	network: string;
}

export type SandboxCallback = (context: { app: Application; container: interfaces.Container }) => void;
