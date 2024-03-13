import type { ProcessableUnit } from "../processor.js";
import type { Block, BlockData, BlockJson } from "./block.js";

export interface CommitJson {
	readonly block: BlockJson;
	readonly proof: CommitProof;
	readonly serialized: string;
}

export interface Commit {
	readonly block: Block;
	readonly proof: CommitProof;
	readonly serialized: string;
}

export interface CommitData {
	readonly block: BlockData;
	readonly proof: CommitProof;
	readonly serialized: string;
}
export type CommitSerializable = Omit<Commit, "serialized">;

export interface CommitFactory {
	fromBytes(buff: Buffer): Promise<Commit>;

	fromJson(json: CommitJson): Promise<Commit>;
}

export interface CommitProof {
	readonly round: number;
	readonly signature: string;
	readonly validators: boolean[];
}

export interface CommitSerializer {
	proofSize(): number;

	serializeCommitProof(proof: CommitProof): Promise<Buffer>;

	serializeCommit(commit: CommitSerializable): Promise<Buffer>;
}

export interface CommitDeserializer {
	deserializeCommitProof(serialized: Buffer): Promise<CommitProof>;
}

export interface CommitHandler {
	onCommit(unit: ProcessableUnit): Promise<void>;
}
