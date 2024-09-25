import { MultiSignatureAsset, Transaction, TransactionConstructor, TransactionData } from "./crypto/index.js";
import { BlockContext, CommitKey, Instance, TransactionReceipt } from "./evm/index.js";
import { Wallet } from "./state/index.js";

export type TransactionHandlerConstructor = new () => TransactionHandler;

export type TransactionHandlerContext = {
	evm: {
		instance: Instance;
		blockContext: BlockContext;
	};
};

export interface TransactionApplyResult {
	gasUsed: number;
	receipt?: TransactionReceipt;
}

export interface TransactionHandler {
	verify(transaction: Transaction): Promise<boolean>;

	throwIfCannotBeApplied(transaction: Transaction, sender: Wallet): Promise<void>;

	apply(context: TransactionHandlerContext, transaction: Transaction): Promise<TransactionApplyResult>;

	emitEvents(transaction: Transaction): void;

	verifySignatures(
		wallet: Wallet,
		transaction: TransactionData,
		multiSignature?: MultiSignatureAsset,
	): Promise<boolean>;

	// Abstract
	getConstructor(): TransactionConstructor;

	dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	isActivated(): Promise<boolean>;
}

export interface TransactionHandlerRegistry {
	initialize(): void;

	getRegisteredHandlers(): TransactionHandler[];

	getRegisteredHandlerByType(internalType: InternalTransactionType, version?: number): TransactionHandler;

	getActivatedHandlers(): Promise<TransactionHandler[]>;

	getActivatedHandlerByType(internalType: InternalTransactionType, version?: number): Promise<TransactionHandler>;

	getActivatedHandlerForData(transactionData: TransactionData): Promise<TransactionHandler>;
}

export interface TransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}

// @TODO: move this out of contracts, it's an implementation
export interface InternalTransactionType {
	// private constructor(public readonly type: number, public readonly typeGroup: number) {}

	toString(): string;
}

export interface TransactionTypeFactory {
	initialize(transactionTypes: Map<InternalTransactionType, Map<number, TransactionConstructor>>);

	create(data: TransactionData): Transaction;

	get(type: number, typeGroup?: number, version?: number): TransactionConstructor;
}

export interface TransactionValidatorContext {
	commitKey: CommitKey;
	gasLimit: number;
	timestamp: number;
	generatorAddress: string;
}

export interface TransactionValidator {
	getEvm(): Instance;
	validate(context: TransactionValidatorContext, transaction: Transaction): Promise<TransactionValidatorResult>;
}

export interface TransactionValidatorResult {
	readonly gasUsed: number;
}

export type TransactionValidatorFactory = () => TransactionValidator;
