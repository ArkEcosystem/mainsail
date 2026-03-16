import type { Block, BlockHeader } from "./block.js";
import type { KeyPair } from "./identities.js";
import type { AggregatedSignature } from "./signatures.js";

export interface ProposalDataSerializableUnsigned {
	readonly round: number;
	readonly validRound?: number;
	readonly payloadSerialized: string;
	readonly validatorIndex: number;
}

export interface ProposalDataSerializable extends ProposalDataSerializableUnsigned {
	readonly signature: string;
}

export interface ProposalData extends ProposalDataSerializable {
	readonly blockHeader: BlockHeader;
	readonly lockProof?: AggregatedSignature;
}

export type ProposedPayloadSerializable = {
	readonly block: Block;
	readonly lockProof?: AggregatedSignature;
};

export interface ProposedPayload extends ProposedPayloadSerializable {
	readonly serialized: string;
}

export interface Proposal extends ProposalData {
	isDataDeserialized: boolean;

	readonly serialized: Buffer;

	deserializePayload(): Promise<void>;
	getPayload(): ProposedPayload;

	toSerializableData(): ProposalDataSerializable;
	toData(): ProposalData;
	toString(): string;
}

export interface ProposalFactory {
	makeProposal(data: ProposalDataSerializableUnsigned, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makePayloadFromBytes(data: Buffer): Promise<ProposedPayload>;
}

export interface ProposalSerializer {
	serializeProposalUnsigned(proposal: ProposalDataSerializableUnsigned): Promise<Buffer>;
	serializeProposal(proposal: ProposalDataSerializable): Promise<Buffer>;
	serializePayload(payload: ProposedPayloadSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;
}

export interface ProposalDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}
