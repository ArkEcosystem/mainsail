import { IProposedBlock } from "./block";
import { IKeyPair } from "./identities";

export enum MessageType {
	Prevote = 1,
	Precommit = 2,
}

export interface ISignatureMessageData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId: string;
}

export type HasBlockId = { blockId: string };
export type WithoutBlockId<T> = Omit<T, "blockId">;
export type WithOptionalBlockId<T extends HasBlockId> = WithoutBlockId<T> & Partial<Pick<T, "blockId">>;
export interface ISignaturePrevoteData extends WithOptionalBlockId<ISignatureMessageData> {}
export interface ISignaturePrecommitData extends WithOptionalBlockId<ISignatureMessageData> {}

export interface IProposalData {
	readonly height: number;
	readonly round: number;
	readonly block: { serialized: string };
	readonly validatorIndex: number;
	readonly validRound?: number;
	readonly signature: string;
}

export interface ISerializableProposalData {
	readonly round: number;
	readonly block: { serialized: string };
	readonly validatorIndex: number;
	readonly signature?: string;
}

export interface IProposal extends IProposalData {
	readonly block: IProposedBlock;
	readonly serialized: Buffer;

	toSerializableData(): ISerializableProposalData;
	toData(): IProposalData;
	toString(): string;
}

export interface IProposalLockProof {
	readonly signature: string;
	readonly validators: boolean[];
}

export interface IPrevoteData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface IPrevote extends IPrevoteData {
	readonly serialized: Buffer;

	toSignatureData(): ISignaturePrevoteData;
	toData(): IPrevoteData;
	toString(): string;
}

export interface IPrecommitData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface IPrecommit extends IPrecommitData {
	readonly serialized: Buffer;

	toSignatureData(): ISignaturePrecommitData;
	toData(): IPrecommitData;
	toString(): string;
}

export interface IValidatorSetMajority {
	signature: string;
	validators: boolean[];
}

export interface SerializeProposalOptions {
	includeSignature?: boolean;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type IMakeProposalData = WithoutSignature<ISerializableProposalData>;
export type IMakePrevoteData = WithoutSignature<IPrevoteData>;
export type IMakePrecommitData = WithoutSignature<IPrecommitData>;

export interface IMessageFactory {
	makeProposal(data: IMakeProposalData, keyPair: IKeyPair): Promise<IProposal>;
	makeProposalFromBytes(data: Buffer): Promise<IProposal>;
	makeProposalFromData(data: IProposalData): Promise<IProposal>;
	makePrevote(data: IMakePrevoteData, keyPair: IKeyPair): Promise<IPrevote>;
	makePrevoteFromBytes(data: Buffer): Promise<IPrevote>;
	makePrevoteFromData(data: IPrevoteData): Promise<IPrevote>;
	makePrecommit(data: IMakePrecommitData, keyPair: IKeyPair): Promise<IPrecommit>;
	makePrecommitFromBytes(data: Buffer): Promise<IPrecommit>;
	makePrecommitFromData(data: IPrecommitData): Promise<IPrecommit>;
}

export interface IMessageSerializer {
	serializeProposal(proposal: ISerializableProposalData, options: SerializeProposalOptions): Promise<Buffer>;
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
	verifyProposalLockProof(
		prevote: ISignaturePrevoteData,
		lockProof: IProposalLockProof,
	): Promise<IMessageVerificationResult>;
}
