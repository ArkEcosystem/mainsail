import { IPrecommit, IPrevote, IProposal } from "./crypto";

export interface IConsensusService {
	run(): Promise<void>;
	onProposal(proposal: IProposal): Promise<void>;
	onMajorityPrevote(proposal: IPrevote): Promise<void>;
	onMajorityPrecommit(proposal: IPrecommit): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}
