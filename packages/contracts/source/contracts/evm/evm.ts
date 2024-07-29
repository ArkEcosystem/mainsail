import { CommitHandler } from "../crypto/commit.js";
import { WalletRepository } from "../state/wallets.js";

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
	stateHash(currentHash: string): Promise<string>;
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
	readonly commitKey: CommitKey;
	readonly walletRepository: WalletRepository;
}

export interface TransactionContext {
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
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
