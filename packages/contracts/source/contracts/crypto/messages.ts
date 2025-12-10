import type { Enums } from "@mainsail/constants";

import type { KeyPair } from "./identities.js";
import type {
	Proposal,
	ProposalData,
	ProposedBlockSerializable,
	ProposedData,
	SerializableProposalData,
	SerializeProposalOptions,
} from "./proposal.js";
import type { AggregatedSignature } from "./signatures.js";

export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
}

export interface MessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Message extends MessageData {
	readonly serialized: Buffer;

	toSignatureData(): SignatureMessageData;
	toString(): string;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type MakeProposalData = WithoutSignature<SerializableProposalData>;
export type MakeMessageData = WithoutSignature<MessageData>;

export interface MessageFactory {
	makeProposal(data: MakeProposalData, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makeProposalFromData(data: ProposalData): Promise<Proposal>;
	makeProposedDataFromBytes(data: Buffer): Promise<ProposedData>;
	makeMessage(data: MakeMessageData, keyPair: KeyPair): Promise<Message>;
	makeMessageFromBytes(data: Buffer): Promise<Message>;
	makeMessageFromData(data: MessageData): Promise<Message>;
}

export interface MessageSerializer {
	serializeProposal(proposal: SerializableProposalData, options: SerializeProposalOptions): Promise<Buffer>;
	serializeMessage(message: MessageData): Promise<Buffer>;
	serializeMessageForSignature(message: SignatureMessageData): Promise<Buffer>;
	serializeProposed(proposedBlock: ProposedBlockSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;

	lockProofSize(): number;
}

export interface MessageDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializeMessage(serialized: Buffer): Promise<MessageData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
