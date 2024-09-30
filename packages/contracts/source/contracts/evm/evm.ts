import { CommitHandler } from "../crypto/commit.js";

export enum EvmMode {
	Ephemeral,
	Persistent,
}

export interface GenesisInfo {
	readonly account: string;
	readonly deployerAccount: string;
	readonly validatorContract: string;
	readonly initialSupply: bigint;
}

export interface Instance extends CommitHandler {
	prepareNextCommit(context: PrepareNextCommitContext): Promise<void>;
	process(txContext: TransactionContext): Promise<ProcessResult>;
	view(viewContext: TransactionViewContext): Promise<ViewResult>;
	initializeGenesis(commit: GenesisInfo): Promise<void>;
	getAccountInfo(address: string): Promise<AccountInfo>;
	calculateTopValidators(context: CalculateTopValidatorsContext): Promise<void>;
	updateRewardsAndVotes(context: UpdateRewardsAndVotesContext): Promise<void>;
	stateHash(commitKey: CommitKey, currentHash: string): Promise<string>;
	codeAt(address: string): Promise<string>;
	storageAt(address: string, slot: bigint): Promise<string>;
	mode(): EvmMode;
}

export interface ProcessResult {
	readonly receipt: TransactionReceipt;
	readonly mocked?: boolean;
}

export interface ViewResult {
	readonly success: boolean;
	readonly output?: Buffer;
}

export interface CommitResult {}

export interface AccountInfo {
	readonly nonce: bigint;
	readonly balance: bigint;
}

export interface AccountUpdate {
	readonly address: string;
	readonly balance: bigint;
	readonly nonce: bigint;

	// TODO: pass contract specific info for wallet table?
	// readonly vote?: string;
	// readonly unvote?: string;
}

export interface AccountUpdateContext {
	readonly account: string;
	readonly commitKey: CommitKey;
	readonly nonce: bigint;
}

export interface PrepareNextCommitContext {
	readonly commitKey: CommitKey;
}

export interface TransactionContext {
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
	readonly value: bigint;
	readonly gasPrice?: bigint;
	readonly nonce: bigint;
	readonly data: Buffer;
	readonly blockContext: BlockContext;
	readonly txHash: string;
	readonly sequence?: number;
	readonly specId: SpecId;
}

export interface TransactionViewContext {
	readonly caller: string;
	readonly recipient: string;
	readonly data: Buffer;
	readonly specId: SpecId;
}

export interface BlockContext {
	readonly commitKey: CommitKey;
	readonly gasLimit: bigint;
	readonly timestamp: bigint;
	readonly validatorAddress: string;
}

export interface CalculateTopValidatorsContext {
	readonly commitKey: CommitKey;
	readonly timestamp: bigint;
	readonly validatorAddress: string;
	readonly activeValidators: bigint;
	readonly specId: SpecId;
}
export interface UpdateRewardsAndVotesContext {
	readonly commitKey: CommitKey;
	readonly timestamp: bigint;
	readonly validatorAddress: string;
	readonly blockReward: bigint;
	readonly specId: SpecId;
}

export interface CommitKey {
	readonly height: bigint;
	readonly round: bigint;
}

export interface TransactionReceipt {
	readonly gasUsed: bigint;
	readonly gasRefunded: bigint;
	readonly success: boolean;
	readonly deployedContractAddress?: string;
	readonly logs: any;
	readonly output?: Buffer;
}

// Supported EVM specs
// https://github.com/ethereum/execution-specs
export enum SpecId {
	SHANGHAI = "Shanghai",
	LATEST = "Latest",
}
