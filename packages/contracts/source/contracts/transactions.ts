import { Transaction, TransactionData } from "./crypto/index.js";
import { BlockContext, CommitKey, Instance, TransactionReceipt } from "./evm/index.js";
import { Wallet } from "./state/index.js";

export type TransactionHandlerConstructor = new () => TransactionHandler;

export type TransactionHandlerContext = {
	evm: {
		instance: Instance;
		blockContext: BlockContext;
	};
};

export interface TransactionHandler {
	verify(transaction: Transaction): Promise<boolean>;

	throwIfCannotBeApplied(transaction: Transaction, sender: Wallet, evm: Instance): Promise<void>;

	apply(context: TransactionHandlerContext, transaction: Transaction): Promise<TransactionReceipt>;
}

export interface TransactionHandlerRegistry {
	getRegisteredHandlers(): TransactionHandler[];

	getRegisteredHandlerByType(type: number, version?: number): TransactionHandler;

	getActivatedHandlers(): Promise<TransactionHandler[]>;

	getActivatedHandlerByType(type: number, version?: number): Promise<TransactionHandler>;

	getActivatedHandlerForData(transactionData: TransactionData): Promise<TransactionHandler>;
}

export interface TransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}

export interface TransactionValidatorContext {
	commitKey: CommitKey;
	gasLimit: number;
	timestamp: number;
	generatorAddress: string;
}

export interface TransactionValidator {
	getEvm(): Instance;
	validate(context: TransactionValidatorContext, transaction: Transaction): Promise<TransactionReceipt>;
}

export type TransactionValidatorFactory = () => TransactionValidator;
