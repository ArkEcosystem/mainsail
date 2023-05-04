import {
	IMultiSignatureAsset,
	ITransaction,
	ITransactionData,
	TransactionConstructor,
	TransactionTypeGroup,
} from "./crypto";
import { EventDispatcher } from "./kernel";
import { Wallet } from "./state";

export type TransactionHandlerConstructor = new () => ITransactionHandler;

export interface ITransactionHandler {
	verify(transaction: ITransaction): Promise<boolean>;

	throwIfCannotBeApplied(transaction: ITransaction, sender: Wallet): Promise<void>;

	apply(transaction: ITransaction): Promise<void>;

	revert(transaction: ITransaction): Promise<void>;

	applyToSender(transaction: ITransaction): Promise<void>;

	revertForSender(transaction: ITransaction): Promise<void>;

	emitEvents(transaction: ITransaction, emitter: EventDispatcher): void;

	throwIfCannotEnterPool(transaction: ITransaction): Promise<void>;

	verifySignatures(
		wallet: Wallet,
		transaction: ITransactionData,
		multiSignature?: IMultiSignatureAsset,
	): Promise<boolean>;

	// Abstract
	getConstructor(): TransactionConstructor;

	dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	walletAttributes(): ReadonlyArray<string>;

	isActivated(): Promise<boolean>;

	bootstrap(transactions: ITransaction[]): Promise<void>;

	applyToRecipient(transaction: ITransaction): Promise<void>;

	revertForRecipient(transaction: ITransaction): Promise<void>;
}

export interface ITransactionHandlerRegistry {
	initialize(): void;

	getRegisteredHandlers(): ITransactionHandler[];

	getRegisteredHandlerByType(internalType: InternalTransactionType, version?: number): ITransactionHandler;

	getActivatedHandlers(): Promise<ITransactionHandler[]>;

	getActivatedHandlerByType(internalType: InternalTransactionType, version?: number): Promise<ITransactionHandler>;

	getActivatedHandlerForData(transactionData: ITransactionData): Promise<ITransactionHandler>;
}

export interface ITransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}

// @TODO: move this out of contracts, it's an implementation
export class InternalTransactionType {
	static #types: Map<string, InternalTransactionType> = new Map();

	private constructor(public readonly type: number, public readonly typeGroup: number) {}

	public static from(type: number, typeGroup?: number): InternalTransactionType {
		if (typeGroup === undefined) {
			typeGroup = TransactionTypeGroup.Core;
		}

		const compositeType = `${typeGroup}-${type}`;

		if (!this.#types.has(compositeType)) {
			this.#types.set(compositeType, new InternalTransactionType(type, typeGroup));
		}

		return this.#types.get(compositeType)!;
	}

	public toString(): string {
		if (this.typeGroup === TransactionTypeGroup.Core) {
			return `Core/${this.type}`;
		}

		return `${this.typeGroup}/${this.type}`;
	}
}

export interface ITransactionTypeFactory {
	initialize(transactionTypes: Map<InternalTransactionType, Map<number, TransactionConstructor>>);

	create(data: ITransactionData): ITransaction;

	get(type: number, typeGroup?: number, version?: number): TransactionConstructor | undefined;
}
