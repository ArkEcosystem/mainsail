import { IMultiSignatureAsset, ITransaction, ITransactionData, TransactionConstructor } from "./crypto";
import { EventDispatcher } from "./kernel";
import { AttributeType, Wallet, WalletRepository } from "./state";

export type TransactionHandlerConstructor = new () => ITransactionHandler;

export interface ITransactionHandler {
	verify(walletRepository: WalletRepository, transaction: ITransaction): Promise<boolean>;

	throwIfCannotBeApplied(
		walletRepository: WalletRepository,
		transaction: ITransaction,
		sender: Wallet,
	): Promise<void>;

	apply(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	revert(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	applyToSender(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	revertForSender(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	emitEvents(transaction: ITransaction, emitter: EventDispatcher): void;

	throwIfCannotEnterPool(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	verifySignatures(
		wallet: Wallet,
		transaction: ITransactionData,
		multiSignature?: IMultiSignatureAsset,
	): Promise<boolean>;

	// Abstract
	getConstructor(): TransactionConstructor;

	dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	walletAttributes(): ReadonlyArray<{ name: string; type: AttributeType }>;

	isActivated(): Promise<boolean>;

	bootstrap(walletRepository: WalletRepository, transactions: ITransaction[]): Promise<void>;

	applyToRecipient(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;

	revertForRecipient(walletRepository: WalletRepository, transaction: ITransaction): Promise<void>;
}

export interface ITransactionHandlerRegistry {
	initialize(): void;

	getRegisteredHandlers(): ITransactionHandler[];

	getRegisteredHandlerByType(internalType: IInternalTransactionType, version?: number): ITransactionHandler;

	getActivatedHandlers(): Promise<ITransactionHandler[]>;

	getActivatedHandlerByType(internalType: IInternalTransactionType, version?: number): Promise<ITransactionHandler>;

	getActivatedHandlerForData(transactionData: ITransactionData): Promise<ITransactionHandler>;
}

export interface ITransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}

// @TODO: move this out of contracts, it's an implementation
export interface IInternalTransactionType {
	// private constructor(public readonly type: number, public readonly typeGroup: number) {}

	toString(): string;
}

export interface ITransactionTypeFactory {
	initialize(transactionTypes: Map<IInternalTransactionType, Map<number, TransactionConstructor>>);

	create(data: ITransactionData): ITransaction;

	get(type: number, typeGroup?: number, version?: number): TransactionConstructor | undefined;
}
