import { Contracts } from "@mainsail/contracts";

export interface IHandler {
	onProposal(proposal: Contracts.Crypto.IProposal): Promise<void>;
	onPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void>;
	onPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void>;
}

export interface IBroadcaster {
	broadcastProposal(proposal: Contracts.Crypto.IProposal): Promise<void>;
	broadcastPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void>;
	broadcastPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void>;
}

export interface IScheduler {
	scheduleTimeoutPropose(height: number, round: number): Promise<void>;
	scheduleTimeoutPrevote(height: number, round: number): Promise<void>;
	scheduleTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IValidator {
	configure(keyPair: Contracts.Crypto.IKeyPair): IValidator;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<Contracts.Crypto.IBlock>;
	propose(height: number, round: number, block: Contracts.Crypto.IBlock): Promise<Contracts.Crypto.IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<Contracts.Crypto.IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<Contracts.Crypto.IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator;
	getValidators(publicKeys: string[]): IValidator[];
}

export interface IValidatorSetMajority {
	aggSignature: string;
	aggPublicKey: string;
	validatorSet: Set<string>;
}
