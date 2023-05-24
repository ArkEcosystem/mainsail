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

export interface IValidatorSetMajority {
	aggSignature: string;
	aggPublicKey: string;
	validatorSet: Set<string>;
}
