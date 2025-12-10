import type { Enums } from "@mainsail/constants";

import type { KeyPair } from "./identities.js";
import type {
	Proposal,
	ProposalData,
	ProposedBlockSerializable,
	ProposedData,
	SerializableProposalData,
} from "./proposal.js";
import type { AggregatedSignature } from "./signatures.js";

export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash: string;
}

export type HasBlockHash = { blockHash: string };
export type WithoutBlockHash<T> = Omit<T, "blockHash">;
export type WithOptionalBlockHash<T extends HasBlockHash> = WithoutBlockHash<T> & Partial<Pick<T, "blockHash">>;
export type SignaturePrevoteData = WithOptionalBlockHash<SignatureMessageData>;
export type SignaturePrecommitData = WithOptionalBlockHash<SignatureMessageData>;

export interface PrevoteData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Prevote extends PrevoteData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrevoteData;
	toString(): string;
}

export interface PrecommitData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Precommit extends PrecommitData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrecommitData;
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
	makeProposedDataFromBytes(data: Buffer): Promise<ProposedData>;
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
	serializeProposed(proposedBlock: ProposedBlockSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;

	lockProofSize(): number;
}

export interface MessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializePrevote(serialized: Buffer): Promise<PrevoteData>;
	deserializePrecommit(serialized: Buffer): Promise<PrecommitData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
