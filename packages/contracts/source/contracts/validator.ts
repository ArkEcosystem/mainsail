import { AggregatedSignature, Block, KeyPair, Precommit, Prevote, Proposal } from "./crypto";

export interface Validator {
	configure(keyPair: KeyPair): Validator;
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
	getValidators(publicKeys: string[]): Validator[];
}
