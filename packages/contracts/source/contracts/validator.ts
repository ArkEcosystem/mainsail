import { AggregatedSignature, Block, KeyPair, Precommit, Prevote, Proposal } from "./crypto";

export interface Validator {
	configure(publicKey: string, keyPair: KeyPair): Validator;
	getWalletPublicKey(): string;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<Block>;
	propose(
		round: number,
		validRound: number | undefined,
		block: Block,
		lockProof?: AggregatedSignature,
	): Promise<Proposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<Prevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<Precommit>;
}

export interface ValidatorRepository {
	getValidator(publicKey: string): Validator | undefined;
	getValidators(publicKeys: string[]): Validator[];
}
