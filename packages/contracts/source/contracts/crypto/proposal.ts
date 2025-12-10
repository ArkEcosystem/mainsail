import type { Block, BlockHeader } from "./block.js";
import type { KeyPair } from "./identities.js";
import type { AggregatedSignature } from "./signatures.js";

type WithoutSignature<T> = Omit<T, "signature">;
export type MakeProposalData = WithoutSignature<SerializableProposalData>;

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

export interface ProposedData {
	readonly block: Block;
	readonly lockProof?: AggregatedSignature;
	readonly serialized: string;
}

export type ProposedBlockSerializable = Omit<ProposedData, "serialized">;

export interface Proposal extends Omit<ProposalData, "data"> {
	isDataDeserialized: boolean;

	readonly serialized: Buffer;

	deserializeData(): Promise<void>;
	getData(): ProposedData;

	toSerializableData(): SerializableProposalData;
	toData(): ProposalData;
	toString(): string;
}

export interface ProposalFactory {
	makeProposal(data: MakeProposalData, keyPair: KeyPair): Promise<Proposal>;
	makeProposalFromBytes(data: Buffer): Promise<Proposal>;
	makeProposalFromData(data: ProposalData): Promise<Proposal>;
	makeProposedDataFromBytes(data: Buffer): Promise<ProposedData>;
}

export interface SerializeProposalOptions {
	includeSignature?: boolean;
}

export interface ProposalSerializer {
	serializeProposal(proposal: SerializableProposalData, options: SerializeProposalOptions): Promise<Buffer>;
	serializeProposed(proposedBlock: ProposedBlockSerializable): Promise<Buffer>;
	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;

	lockProofSize(): number;
}

export interface ProposalDeserializer {
	deserializeProposal(serialized: Buffer): Promise<ProposalData>;
	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;
}
