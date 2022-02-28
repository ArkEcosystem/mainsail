import Interfaces from "@arkecosystem/core-crypto-contracts";

import { EventDispatcher } from "./kernel";
import { Wallet } from "./state";

export type TransactionHandlerConstructor = new () => ITransactionHandler;

export interface ITransactionHandler {
	verify(transaction: Interfaces.ITransaction): Promise<boolean>;

	throwIfCannotBeApplied(transaction: Interfaces.ITransaction, sender: Wallet): Promise<void>;

	apply(transaction: Interfaces.ITransaction): Promise<void>;

	revert(transaction: Interfaces.ITransaction): Promise<void>;

	applyToSender(transaction: Interfaces.ITransaction): Promise<void>;

	revertForSender(transaction: Interfaces.ITransaction): Promise<void>;

	emitEvents(transaction: Interfaces.ITransaction, emitter: EventDispatcher): void;

	throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void>;

	verifySignatures(
		wallet: Wallet,
		transaction: Interfaces.ITransactionData,
		multiSignature?: Interfaces.IMultiSignatureAsset,
	): Promise<boolean>;

	// Abstract
	getConstructor(): Interfaces.TransactionConstructor;

	dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	walletAttributes(): ReadonlyArray<string>;

	isActivated(): Promise<boolean>;

	bootstrap(): Promise<void>;

	applyToRecipient(transaction: Interfaces.ITransaction): Promise<void>;

	revertForRecipient(transaction: Interfaces.ITransaction): Promise<void>;
}

export interface ITransactionHandlerRegistry {
	initialize(): void;

	getRegisteredHandlers(): ITransactionHandler[];

	getRegisteredHandlerByType(internalType: InternalTransactionType, version?: number): ITransactionHandler;

	getActivatedHandlers(): Promise<ITransactionHandler[]>;

	getActivatedHandlerByType(internalType: InternalTransactionType, version?: number): Promise<ITransactionHandler>;

	getActivatedHandlerForData(transactionData: Interfaces.ITransactionData): Promise<ITransactionHandler>;
}

export interface ITransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}

// @TODO
export class InternalTransactionType {
	private static types: Map<string, InternalTransactionType> = new Map();

	private constructor(public readonly type: number, public readonly typeGroup: number) {}

	public static from(type: number, typeGroup?: number): InternalTransactionType {
		if (typeGroup === undefined) {
			typeGroup = TransactionTypeGroup.Core;
		}

		const compositeType = `${typeGroup}-${type}`;
		if (!this.types.has(compositeType)) {
			this.types.set(compositeType, new InternalTransactionType(type, typeGroup));
		}

		return this.types.get(compositeType)!;
	}

	public toString(): string {
		if (this.typeGroup === TransactionTypeGroup.Core) {
			return `Core/${this.type}`;
		}

		return `${this.typeGroup}/${this.type}`;
	}
}

export enum TransactionType {
	Transfer = 0,
	DelegateRegistration = 2,
	Vote = 3,
	MultiSignature = 4,
	MultiPayment = 6,
	DelegateResignation = 7,
}

export enum TransactionTypeGroup {
	Test = 0,
	Core = 1,

	// Everything above is available to anyone
	Reserved = 1000,
}
