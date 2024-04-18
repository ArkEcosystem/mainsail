import { AggregatedSignature, Block, KeyPair, Precommit, Prevote, Proposal } from "./crypto/index.js";

export interface ValidatorKeyPair {
	readonly publicKey: string;
	getKeyPair(): Promise<KeyPair>;
}

export interface Validator {
	configure(keyPair: ValidatorKeyPair): Validator;
	getConsensusPublicKey(): string;
	prepareBlock(generatorPublicKey: string, round: number): Promise<Block>;
	propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Block,
		lockProof?: AggregatedSignature,
	): Promise<Proposal>;
	prevote(validatorIndex: number, height: number, round: number, blockId: string | undefined): Promise<Prevote>;
	precommit(validatorIndex: number, height: number, round: number, blockId: string | undefined): Promise<Precommit>;
}

export interface ValidatorRepository {
	getValidator(publicKey: string): Validator | undefined;
	printLoadedValidators(): void;
}
