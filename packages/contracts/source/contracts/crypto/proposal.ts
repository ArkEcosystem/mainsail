import type { Block, BlockHeader } from "./block.js";
import type { KeyPair } from "./identities.js";
import type { AggregatedSignature } from "./signatures.js";

export interface ProposalData {
	readonly blockHeader: BlockHeader;
	readonly lockProof?: AggregatedSignature;
	readonly round: number;
	readonly data: { serialized: string };
	readonly validatorIndex: number;
	readonly validRound?: number;
	readonly signature: string;
}

export interface ProposalDataSerializableUnsigned {
	readonly round: number;
	readonly validRound?: number;
	readonly data: { serialized: string };
	readonly validatorIndex: number;
}

export interface ProposalDataSerializable extends ProposalDataSerializableUnsigned {
	readonly signature: string;
}

export type ProposedDataSerializable = {
	readonly block: Block;
	readonly lockProof?: AggregatedSignature;
}

export interface ProposedData extends ProposedDataSerializable {
	readonly serialized: string;
}

export interface Proposal extends Omit<ProposalData, "data"> {
	isDataDeserialized: boolean;

	readonly serialized: Buffer;

	deserializeData(): Promise<void>;
	getData(): ProposedData;

	toSerializableData(): ProposalDataSerializable;
	toData(): ProposalData;
	toString(): string;
}

export interface ProposalFactory {
	makeProposal(data: ProposalDataSerializableUnsigned, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makeProposalFromData(data: ProposalData): Promise<Proposal>;
	makeProposedDataFromBytes(data: Buffer): Promise<ProposedData>;
}

export interface ProposalSerializer {
	serializeProposalUnsigned(proposal: ProposalDataSerializableUnsigned): Promise<Buffer>;
	serializeProposal(proposal: ProposalDataSerializable): Promise<Buffer>;
	serializeProposedData(proposedData: ProposedDataSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;
}

export interface ProposalDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}
