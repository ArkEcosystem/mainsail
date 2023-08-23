import { IBlock, IKeyPair, IPrecommit, IPrevote, IProposal, IProposalLockProof } from "./crypto";

export interface IValidator {
	configure(publicKey: string, keyPair: IKeyPair): IValidator;
	getWalletPublicKey(): string;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<IBlock>;
	propose(
		round: number,
		validRound: number | undefined,
		block: IBlock,
		lockProof?: IProposalLockProof,
	): Promise<IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator | undefined;
	getValidators(publicKeys: string[]): IValidator[];
}
