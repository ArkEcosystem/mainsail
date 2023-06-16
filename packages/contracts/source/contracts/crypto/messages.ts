import { IBlock } from "./block";
import { IKeyPair } from "./identities";

export enum MessageType {
	Prevote = 1,
	Precommit = 2,
}

export interface IProposalLockProof {
	readonly signature: string;
	readonly validators: boolean[];
}

export interface IProposalData {
	readonly height: number;
	readonly round: number;
	readonly validRound?: number;
	readonly block: { serialized: string };
	readonly validatorIndex: number;
	readonly lockProof?: IProposalLockProof;
	readonly signature: string;
}

export interface IProposal {
	readonly height: number;
	readonly round: number;
	readonly validRound?: number;
	readonly block: IBlock;
	readonly validatorIndex: number;
	readonly lockProof?: IProposalLockProof;
	readonly signature: string;
	toString(): string;
	// toData(): IProposalData;
}

export interface IPrevoteData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface IPrevote {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
	toString(): string;
	// toData(): IPrevoteData;
}

export interface IPrecommitData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface IPrecommit {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
	toString(): string;
	// toData(): IPrecommitData;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type IMakeProposalData = WithoutSignature<IProposalData & { block: IBlock }>;
export type IMakePrevoteData = WithoutSignature<IPrevoteData>;
export type IMakePrecommitData = WithoutSignature<IPrecommitData>;

export interface IMessageFactory {
	makeProposal(data: IMakeProposalData, keyPair: IKeyPair): Promise<IProposal>;
	makeProposalFromBytes(data: Buffer): Promise<IProposal>;
	makePrevote(data: IMakePrevoteData, keyPair: IKeyPair): Promise<IPrevote>;
	makePrevoteFromBytes(data: Buffer): Promise<IPrevote>;
	makePrecommit(data: IMakePrecommitData, keyPair: IKeyPair): Promise<IPrecommit>;
	makePrecommitFromBytes(data: Buffer): Promise<IPrecommit>;
}

export type IMessageSerializableProposal = OptionalSignature<IProposalData>;
export type IMessageSerializablePrevote = OptionalSignature<IPrevoteData>;
export type IMessageSerializablePrecommit = OptionalSignature<IPrecommitData>;

export interface IMessageSerializeOptions {
	excludeSignature?: boolean;
}
export interface IMessageSerializer {
	serializeProposal(proposal: IMessageSerializableProposal, options?: IMessageSerializeOptions): Promise<Buffer>;
	serializePrevote(prevote: IMessageSerializablePrevote, options?: IMessageSerializeOptions): Promise<Buffer>;
	serializePrecommit(precommit: IMessageSerializablePrecommit, options?: IMessageSerializeOptions): Promise<Buffer>;
}

export interface IMessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<IProposalData>;
	deserializePrevote(serialized: Buffer): Promise<IPrevoteData>;
	deserializePrecommit(serialized: Buffer): Promise<IPrecommitData>;
}

export interface IMessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}

export interface IMessageVerifier {
	verifyProposal(proposal: IProposalData): Promise<IMessageVerificationResult>;
	verifyPrevote(prevote: IPrevoteData): Promise<IMessageVerificationResult>;
	verifyPrecommit(precommit: IPrecommitData): Promise<IMessageVerificationResult>;
	verifyProposalLockProof(lockProof: IProposalLockProof, prevote: IPrevoteData): Promise<IMessageVerificationResult>;
}
