import { Contracts } from "@mainsail/contracts";

export interface IProposalData {
	height: number;
	round: number;
	block: Contracts.Crypto.IBlock;
	validatorPublicKey: string;
	signature: string;
}

export interface IProposal {
	toString(): string;
	toData(): IProposalData;
}

export interface IPrevoteData {
	height: number;
	round: number;
	blockId?: string;
	validatorPublicKey: string;
	signature: string;
}

export interface IPrevote {
	toString(): string;
	toData(): IPrevoteData;
}

export interface IPrecommitData {
	height: number;
	round: number;
	blockId?: string;
	validatorPublicKey: string;
	signature: string;
}

export interface IPrecommit {
	toString(): string;
	toData(): IPrecommitData;
}

export interface IConsensus {
	onProposal(proposal: IProposal): Promise<void>;
	onMajorityPrevote(proposal: IProposal): Promise<void>;
	onMajorityPrecommit(proposal: IProposal): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IHandler {
	onProposal(proposal: IProposal): Promise<void>;
	onPrevote(prevote: IPrevote): Promise<void>;
	onPrecommit(precommit: IPrecommit): Promise<void>;
}

export interface IBroadcaster {
	broadcastProposal(proposal: IProposal): Promise<void>;
	broadcastPrevote(prevote: IPrevote): Promise<void>;
	broadcastPrecommit(precommit: IPrecommit): Promise<void>;
}

export interface IScheduler {
	scheduleTimeoutPropose(height: number, round: number): Promise<void>;
	scheduleTimeoutPrevote(height: number, round: number): Promise<void>;
	scheduleTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type IMakeProposalData = WithoutSignature<IProposalData>;
export type IMakePrevoteData = WithoutSignature<IPrevoteData>;
export type IMakePrecommitData = WithoutSignature<IPrecommitData>;

export interface IMessageFactory {
	makeProposal(data: IMakeProposalData, keyPair: Contracts.Crypto.IKeyPair): Promise<IProposal>;
	makePrevote(data: IMakePrevoteData, keyPair: Contracts.Crypto.IKeyPair): Promise<IPrevote>;
	makePrecommit(data: IMakePrecommitData, keyPair: Contracts.Crypto.IKeyPair): Promise<IPrecommit>;
}

export interface ISerializeOptions {
	excludeSignature?: boolean;
}
export interface ISerializeProposalOptions extends ISerializeOptions {}
export interface ISerializePrevoteOptions extends ISerializeOptions {}
export interface ISerializePrecommitOptions extends ISerializeOptions {}

export type ISerializableProposal = OptionalSignature<IProposalData>;
export type ISerializablePrevote = OptionalSignature<IPrevoteData>;
export type ISerializablePrecommit = OptionalSignature<IPrecommitData>;

export interface ISerializer {
	serializeProposal(proposal: ISerializableProposal, options?: ISerializeProposalOptions): Promise<Buffer>;
	serializePrevote(prevote: ISerializablePrevote, options?: ISerializePrevoteOptions): Promise<Buffer>;
	serializePrecommit(precommit: ISerializablePrecommit, options?: ISerializePrecommitOptions): Promise<Buffer>;
}
