import type { Enums } from "@mainsail/constants";

import type { Block, BlockHeader } from "./block.js";
import type { KeyPair } from "./identities.js";
import type { AggregatedSignature } from "./signatures.js";

export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
}

export interface ProposalData {
	readonly blockHeader: BlockHeader;
	readonly lockProof?: AggregatedSignature;
	readonly round: number;
	readonly data: { serialized: string };
	readonly validatorIndex: number;
	readonly validRound?: number;
	readonly signature: string;
}

export interface SerializableProposalData {
	readonly round: number;
	readonly validRound?: number;
	readonly data: { serialized: string };
	readonly validatorIndex: number;
	readonly signature?: string;
}

export interface Proposal extends Omit<ProposalData, "data"> {
	isDataDeserialized: boolean;

	readonly serialized: Buffer;

	deserializeData(): Promise<void>;
	getData(): ProposedData;

	toSerializableData(): SerializableProposalData;
	toData(): ProposalData;
	toString(): string;
}

export interface MessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Prevote extends MessageData {
	readonly serialized: Buffer;

	toSignatureData(): SignatureMessageData;
	toString(): string;
}

export interface Precommit extends MessageData {
	readonly serialized: Buffer;

	toSignatureData(): SignatureMessageData;
	toString(): string;
}

export interface ProposedData {
	readonly block: Block;
	readonly lockProof?: AggregatedSignature;
	readonly serialized: string;
}

export type ProposedBlockSerializable = Omit<ProposedData, "serialized">;

export interface SerializeProposalOptions {
	includeSignature?: boolean;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type MakeProposalData = WithoutSignature<SerializableProposalData>;
export type MakePrevoteData = WithoutSignature<MessageData>;
export type MakePrecommitData = WithoutSignature<MessageData>;

export interface MessageFactory {
	makeProposal(data: MakeProposalData, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makeProposalFromData(data: ProposalData): Promise<Proposal>;
	makeProposedDataFromBytes(data: Buffer): Promise<ProposedData>;
	makePrevote(data: MakePrevoteData, keyPair: KeyPair): Promise<Prevote>;
	makePrevoteFromBytes(data: Buffer): Promise<Prevote>;
	makePrevoteFromData(data: MessageData): Promise<Prevote>;
	makePrecommit(data: MakePrecommitData, keyPair: KeyPair): Promise<Precommit>;
	makePrecommitFromBytes(data: Buffer): Promise<Precommit>;
	makePrecommitFromData(data: MessageData): Promise<Precommit>;
}

export interface MessageSerializer {
	serializeProposal(proposal: SerializableProposalData, options: SerializeProposalOptions): Promise<Buffer>;
	serializePrevote(prevote: MessageData): Promise<Buffer>;
	serializePrevoteForSignature(prevote: SignatureMessageData): Promise<Buffer>;
	serializePrecommit(precommit: MessageData): Promise<Buffer>;
	serializePrecommitForSignature(precommit: SignatureMessageData): Promise<Buffer>;
	serializeProposed(proposedBlock: ProposedBlockSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;

	lockProofSize(): number;
}

export interface MessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializePrevote(serialized: Buffer): Promise<MessageData>;
	deserializePrecommit(serialized: Buffer): Promise<MessageData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
