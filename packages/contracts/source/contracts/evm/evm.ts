import { CommitHandler } from "../crypto/commit.js";

export enum EvmMode {
	Ephemeral,
	Mock,
	Persistent,
}

export interface Instance extends CommitHandler {
	process(txContext: TransactionContext): Promise<ProcessResult>;
	view(viewContext: TransactionViewContext): Promise<ViewResult>;
	getAccountInfo(address: string): Promise<AccountInfo>;
	updateAccountInfo(context: AccountUpdateContext): Promise<void>;
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

export interface AccountUpdateContext {
	readonly account: string;
	readonly commitKey: CommitKey;
	readonly nonce: bigint;
}

export interface TransactionContext {
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
	readonly value: bigint;
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
