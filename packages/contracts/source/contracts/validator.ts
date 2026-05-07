import type { AggregatedSignature, Block, KeyPair, Message, Proposal, Transaction } from "./crypto/index.js";
import type { CommitKey } from "./evm/index.js";

export interface ValidatorKeyPair {
	readonly publicKey: string;
	getKeyPair(): Promise<KeyPair>;
}

export interface Validator {
	configure(keyPair: ValidatorKeyPair): Validator;
	getConsensusPublicKey(): string;
	prepareBlock(generatorAddress: string, round: number, timestamp: number): Promise<Block>;
	propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Block,
		lockProof?: AggregatedSignature,
	): Promise<Proposal>;
	prevote(
		validatorIndex: number,
		blockHeight: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Message>;
	precommit(
		validatorIndex: number,
		blockHeight: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Message>;
}

export interface ValidatorRepository {
	getValidator(publicKey: string): Validator | undefined;
	printLoadedValidators(): void;
}

export interface TransactionForger {
	getTransactions(
		generatorAddress: string,
		timestamp: number,
		commitKey: CommitKey,
	): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Transaction[];
		gasUsed: number;
		fee: bigint;
	}>;
}

export interface BlockForger {
	forgeBlock(generatorAddress: string, round: number, timestamp: number): Promise<Block>;
}
