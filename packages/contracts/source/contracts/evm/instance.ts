import { CommitHandler } from "../crypto/commit-handler.js";
import {
	AccountInfo,
	AccountInfoExtended,
	CalculateActiveValidatorsContext,
	CommitKey,
	EvmMode,
	GenesisInfo,
	GetAccountsResult,
	GetLegacyColdWalletsResult,
	GetReceiptResult,
	GetReceiptsResult,
	ImportLegacyColdWallet,
	PrepareNextCommitContext,
	PreverifyTransactionContext,
	PreverifyTransactionResult,
	ProcessResult,
	TransactionContext,
	TransactionViewContext,
	UpdateRewardsAndVotesContext,
	ViewResult,
} from "./evm.js";

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
