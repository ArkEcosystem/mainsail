import { ProposedBlock } from "./block";
import { KeyPair } from "./identities";

export enum MessageType {
	Prevote = 1,
	Precommit = 2,
}

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId: string;
}

export type HasBlockId = { blockId: string };
export type WithoutBlockId<T> = Omit<T, "blockId">;
export type WithOptionalBlockId<T extends HasBlockId> = WithoutBlockId<T> & Partial<Pick<T, "blockId">>;
export interface SignaturePrevoteData extends WithOptionalBlockId<SignatureMessageData> { }
export interface SignaturePrecommitData extends WithOptionalBlockId<SignatureMessageData> { }

export interface ProposalData {
	readonly height: number;
	readonly round: number;
	readonly block: { serialized: string };
	readonly validatorIndex: number;
	readonly validRound?: number;
	readonly signature: string;
}

export interface SerializableProposalData {
	readonly round: number;
	readonly validRound?: number;
	readonly block: { serialized: string };
	readonly validatorIndex: number;
	readonly signature?: string;
}

export interface Proposal extends ProposalData {
	readonly block: ProposedBlock;
	readonly serialized: Buffer;

	toSerializableData(): SerializableProposalData;
	toData(): ProposalData;
	toString(): string;
}

export interface PrevoteData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Prevote extends PrevoteData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrevoteData;
	toData(): PrevoteData;
	toString(): string;
}

export interface PrecommitData {
	readonly type: MessageType;
	readonly height: number;
	readonly round: number;
	readonly blockId?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Precommit extends PrecommitData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrecommitData;
	toData(): PrecommitData;
	toString(): string;
}

export interface SerializeProposalOptions {
	includeSignature?: boolean;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type MakeProposalData = WithoutSignature<SerializableProposalData>;
export type MakePrevoteData = WithoutSignature<PrevoteData>;
export type MakePrecommitData = WithoutSignature<PrecommitData>;

export interface MessageFactory {
	makeProposal(data: MakeProposalData, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makeProposalFromData(data: ProposalData): Promise<Proposal>;
	makePrevote(data: MakePrevoteData, keyPair: KeyPair): Promise<Prevote>;
	makePrevoteFromBytes(data: Buffer): Promise<Prevote>;
	makePrevoteFromData(data: PrevoteData): Promise<Prevote>;
	makePrecommit(data: MakePrecommitData, keyPair: KeyPair): Promise<Precommit>;
	makePrecommitFromBytes(data: Buffer): Promise<Precommit>;
	makePrecommitFromData(data: PrecommitData): Promise<Precommit>;
}

export interface MessageSerializer {
	serializeProposal(proposal: SerializableProposalData, options: SerializeProposalOptions): Promise<Buffer>;
	serializePrevote(prevote: PrevoteData): Promise<Buffer>;
	serializePrevoteForSignature(prevote: SignaturePrevoteData): Promise<Buffer>;
	serializePrecommit(precommit: PrecommitData): Promise<Buffer>;
	serializePrecommitForSignature(precommit: SignaturePrecommitData): Promise<Buffer>;
}

export interface MessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializePrevote(serialized: Buffer): Promise<PrevoteData>;
	deserializePrecommit(serialized: Buffer): Promise<PrecommitData>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
