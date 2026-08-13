import type { Step } from "./consensus/enums.js";
import type { AggregatedSignature, Block, KeyPair, Message, Proposal } from "./crypto/index.js";

export interface ValidatorKeyPair {
	readonly publicKey: string;
	getKeyPair(): Promise<KeyPair>;
}

export interface Validator {
	configure(keyPair: ValidatorKeyPair): Validator;
	getConsensusPublicKey(): string;
	propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Block,
		lockProof?: AggregatedSignature,
	): Promise<Proposal>;
	prevote(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Message>;
	precommit(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Message>;
}

export interface ValidatorRepository {
	getValidator(publicKey: string): Validator | undefined;
	printLoadedValidators(): void;
}

export interface SigningPosition {
	readonly blockNumber: number;
	readonly round: number;
	readonly step: Step;
	readonly value?: string; // block hash being signed; undefined for a nil vote
}

export interface DoubleSignGuard {
	guard(publicKey: string, position: SigningPosition): Promise<void>;
}
