import type { Block, BlockHeader } from "./block.js";
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
