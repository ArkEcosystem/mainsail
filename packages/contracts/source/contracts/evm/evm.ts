import { CommitHandler } from "../crypto/commit.js";

export enum EvmMode {
	Ephemeral,
	Persistent,
}

export interface GenesisInfo {
	readonly account: string;
	readonly deployerAccount: string;
	readonly validatorContract: string;
	readonly usernameContract: string;
	readonly initialSupply: bigint;
}

export interface Instance extends CommitHandler {
	prepareNextCommit(context: PrepareNextCommitContext): Promise<void>;
	preverifyTransaction(txContext: PreverifyTransactionContext): Promise<PreverifyTransactionResult>;
	process(txContext: TransactionContext): Promise<ProcessResult>;
	view(viewContext: TransactionViewContext): Promise<ViewResult>;
	initializeGenesis(commit: GenesisInfo): Promise<void>;
	getAccountInfo(address: string, height?: bigint): Promise<AccountInfo>;
	getAccountInfoExtended(address: string, legacyAddress?: string): Promise<AccountInfoExtended>;
	importAccountInfo(info: AccountInfoExtended): Promise<void>;
	importLegacyColdWallet(wallet: ImportLegacyColdWallet): Promise<void>;
	getAccounts(offset: bigint, limit: bigint): Promise<GetAccountsResult>;
	getLegacyColdWallets(offset: bigint, limit: bigint): Promise<GetLegacyColdWalletsResult>;
	getReceipts(offset: bigint, limit: bigint): Promise<GetReceiptsResult>;
	getReceipt(height: bigint, txHash: string): Promise<GetReceiptResult>;
	calculateActiveValidators(context: CalculateActiveValidatorsContext): Promise<void>;
	updateRewardsAndVotes(context: UpdateRewardsAndVotesContext): Promise<void>;
	logsBloom(commitKey: CommitKey): Promise<string>;
	stateHash(commitKey: CommitKey, currentHash: string): Promise<string>;
	codeAt(address: string, height?: bigint): Promise<string>;
	storageAt(address: string, slot: bigint): Promise<string>;
	mode(): EvmMode;
	dispose(): Promise<void>;
}

export interface ProcessResult {
	readonly receipt: TransactionReceipt;
	readonly mocked?: boolean;
}

export interface ViewResult {
	readonly success: boolean;
	readonly output?: Buffer;
}

export interface PreverifyTransactionResult {
	readonly success: boolean;
	readonly initialGasUsed: bigint;
	readonly error?: string;
}

export interface CommitResult {}

export interface AccountInfo {
	readonly nonce: bigint;
	readonly balance: bigint;
}

export interface AccountInfoExtended extends AccountInfo {
	readonly address: string;
	readonly legacyAttributes: LegacyAttributes;
}

export interface ImportLegacyColdWallet {
	readonly address: string;
	readonly balance: bigint;
	readonly legacyAttributes: LegacyAttributes;
}

export interface LegacyColdWallet {
	readonly address: string;
	readonly balance: bigint;
	readonly legacyAttributes: LegacyAttributes;
	readonly mergeInfo?: AccountMergeInfo;
}

export interface AccountMergeInfo {
	readonly address: string;
	readonly txHash: string;
}

export interface LegacyAttributes {
	readonly secondPublicKey?: string;
	readonly multiSignature?: LegacyMultiSignatureAttribute;
}

export interface LegacyMultiSignatureAttribute {
	readonly min: number;
	readonly publicKeys: string[];
}

export interface AccountUpdate {
	readonly address: string;
	readonly balance: bigint;
	readonly nonce: bigint;

	readonly vote?: string;
	readonly unvote?: string;
	readonly username?: string;
	readonly usernameResigned: boolean;
	readonly legacyMergeInfo?: AccountMergeInfo;
}

export interface AccountUpdateContext {
	readonly account: string;
	readonly commitKey: CommitKey;
	readonly nonce: bigint;
}

export interface PrepareNextCommitContext {
	readonly commitKey: CommitKey;
}

export interface PreverifyTransactionContext {
	readonly caller: string;
	readonly legacyAddress?: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
	readonly value: bigint;
	readonly gasPrice: bigint;
	readonly nonce: bigint;
	readonly data: Buffer;
	readonly txHash: string;
	readonly sequence?: number;
	readonly specId: SpecId;
	readonly blockGasLimit: bigint;
}

export interface TransactionContext {
	readonly caller: string;
	readonly legacyAddress?: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
	readonly value: bigint;
	readonly gasPrice: bigint;
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
	readonly gasLimit?: bigint;
}

export interface GetAccountsResult {
	readonly nextOffset?: bigint;
	readonly accounts: AccountInfoExtended[];
}

export interface GetLegacyColdWalletsResult {
	readonly nextOffset?: bigint;
	readonly wallets: LegacyColdWallet[];
}

export interface GetReceiptsResult {
	readonly nextOffset?: bigint;
	readonly receipts: TransactionReceipt[];
}

export interface GetReceiptResult {
	readonly receipt?: TransactionReceipt;
}

export interface BlockContext {
	readonly commitKey: CommitKey;
	readonly gasLimit: bigint;
	readonly timestamp: bigint;
	readonly validatorAddress: string;
}

export interface CalculateActiveValidatorsContext {
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

	// Only present when reading receipts explicitly via `get_receipts`
	readonly blockHeight?: bigint;
	readonly txHash?: string;
}

// Supported EVM specs
// https://github.com/ethereum/execution-specs
export enum SpecId {
	SHANGHAI = "Shanghai",
	LATEST = "Latest",
}
