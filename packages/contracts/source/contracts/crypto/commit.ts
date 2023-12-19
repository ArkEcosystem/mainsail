import { ProcessableUnit } from "../processor";
import { Block, BlockCommit, BlockData, BlockJson } from "./block";

export interface CommittedBlockJson {
	readonly block: BlockJson;
	readonly commit: BlockCommit;
	readonly serialized: string;
}

export interface CommittedBlock {
	readonly block: Block;
	readonly commit: BlockCommit;
	readonly serialized: string;
}

export interface CommittedBlockData {
	readonly block: BlockData;
	readonly commit: BlockCommit;
	readonly serialized: string;
}
export type CommittedBlockSerializable = Omit<CommittedBlock, "serialized">;

export interface CommitBlockFactory {
	fromBytes(buff: Buffer): Promise<CommittedBlock>;

	fromJson(json: CommittedBlockJson): Promise<CommittedBlock>;
}

export interface CommitBlockSerializer {
	commitSize(): number;

	serializeCommit(commit: BlockCommit): Promise<Buffer>;

	serializeFull(committedBlock: CommittedBlockSerializable): Promise<Buffer>;
}

export interface CommitBlockDeserializer {
	deserializeCommit(serialized: Buffer): Promise<BlockCommit>;
}

export interface CommitHandler {
	onCommit(unit: ProcessableUnit): Promise<void>;
}
