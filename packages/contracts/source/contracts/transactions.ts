import { MultiSignatureAsset, Transaction, TransactionConstructor, TransactionData } from "./crypto/index.js";
import { Instance } from "./evm/index.js";
import { EventDispatcher } from "./kernel/events.js";
import { AttributeType, Wallet, WalletRepository } from "./state/index.js";

export type TransactionHandlerConstructor = new () => TransactionHandler;

export type TransactionHandlerContext = {
	walletRepository: WalletRepository;
	evm: Instance;
};

export interface TransactionHandler {
	verify(context: TransactionHandlerContext, transaction: Transaction): Promise<boolean>;

	throwIfCannotBeApplied(context: TransactionHandlerContext, transaction: Transaction, sender: Wallet): Promise<void>;

	apply(context: TransactionHandlerContext, transaction: Transaction): Promise<void>;

	applyToSender(context: TransactionHandlerContext, transaction: Transaction): Promise<void>;

	emitEvents(transaction: Transaction, emitter: EventDispatcher): void;

	throwIfCannotEnterPool(context: TransactionHandlerContext, transaction: Transaction): Promise<void>;

	verifySignatures(
		wallet: Wallet,
		transaction: TransactionData,
		multiSignature?: MultiSignatureAsset,
	): Promise<boolean>;

	// Abstract
	getConstructor(): TransactionConstructor;

	dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	walletAttributes(): ReadonlyArray<{ name: string; type: AttributeType }>;

	isActivated(): Promise<boolean>;

	applyToRecipient(context: TransactionHandlerContext, transaction: Transaction): Promise<void>;
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
