import { IBlock, IKeyPair, IPrecommit, IPrevote, IProposal } from "./crypto";
import { WalletRepository } from "./state";

export interface IRoundState {
	getWalletRepository(): WalletRepository;
}

export interface IConsensusService {
	run(): Promise<void>;
	onProposal(proposal: IProposal): Promise<void>;
	onMajorityPrevote(proposal: IPrevote): Promise<void>;
	onMajorityPrecommit(proposal: IPrecommit): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IValidator {
	configure(publicKey: string, keyPair: IKeyPair): IValidator;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<IBlock>;
	propose(height: number, round: number, block: IBlock): Promise<IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator;
	getValidators(publicKeys: string[]): IValidator[];
}
