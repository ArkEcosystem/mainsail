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

export interface ISignatureMessageData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId: string;
}

export type HasBlockId = { blockId: string }
export type WithoutBlockId<T> = Omit<T, "blockId">;
export type WithOptionalBlockId<T extends HasBlockId> = WithoutBlockId<T> & Partial<Pick<T, "blockId">>;
export interface ISignatureProposalData extends Omit<ISignatureMessageData, "type"> { }
export interface ISignaturePrevoteData extends WithOptionalBlockId<ISignatureMessageData> { }
export interface ISignaturePrecommitData extends WithOptionalBlockId<ISignatureMessageData> { }

export interface IProposal {
	readonly height: number;
	readonly round: number;
	readonly validRound?: number;
	readonly block: IBlock;
	readonly validatorIndex: number;
	readonly lockProof?: IProposalLockProof;
	readonly signature: string;
	toSignatureData(): ISignatureProposalData;
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
	toSignatureData(): ISignaturePrevoteData;
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
	toSignatureData(): ISignaturePrecommitData;
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

export interface IMessageSerializer {
	serializeProposal(proposal: IProposalData): Promise<Buffer>;
	serializeProposalForSignature(proposal: ISignatureProposalData): Promise<Buffer>;
	serializePrevote(prevote: IPrevoteData): Promise<Buffer>;
	serializePrevoteForSignature(prevote: ISignaturePrevoteData): Promise<Buffer>;
	serializePrecommit(precommit: IPrecommitData): Promise<Buffer>;
	serializePrecommitForSignature(precommit: ISignaturePrecommitData): Promise<Buffer>;
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
	verifyProposal(proposal: IProposal): Promise<IMessageVerificationResult>;
	verifyPrevote(prevote: IPrevote): Promise<IMessageVerificationResult>;
	verifyPrecommit(precommit: IPrecommit): Promise<IMessageVerificationResult>;
	verifyProposalLockProof(prevote: IPrevote, lockProof: IProposalLockProof,): Promise<IMessageVerificationResult>;
}
