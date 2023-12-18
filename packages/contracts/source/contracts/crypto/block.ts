import { BigNumber } from "@mainsail/utils";

import { Mutable } from "../../utils";
import { ProcessableUnit } from "../processor";
import { AggregatedSignature } from "./signatures";
import { Transaction, TransactionData, TransactionJson } from "./transactions";

export interface BlockVerification {
	readonly verified: boolean;
	readonly errors: string[];
	readonly containsMultiSignatures: boolean;
}

export type BlockHeader = Exclude<BlockData, "transactions">;

export interface Block {
	readonly data: BlockData;
	readonly header: BlockHeader;
	readonly serialized: string;
	readonly transactions: Transaction[];
}

export interface BlockData {
	readonly id: string;

	readonly timestamp: number;
	readonly version: number;
	readonly height: number;
	readonly previousBlock: string;
	readonly numberOfTransactions: number;
	readonly totalAmount: BigNumber;
	readonly totalFee: BigNumber;
	readonly reward: BigNumber;
	readonly payloadLength: number;
	readonly payloadHash: string;
	readonly generatorPublicKey: string;

	// TODO: transactions field is missing when retrieved from storage
	// and numberOfTransactions = 0
	readonly transactions: TransactionData[];
}

export interface BlockJson {
	readonly id: string;

	readonly timestamp: number;
	readonly version: number;
	readonly height: number;
	readonly previousBlock: string;
	readonly numberOfTransactions: number;
	readonly totalAmount: string;
	readonly totalFee: string;
	readonly reward: string;
	readonly payloadLength: number;
	readonly payloadHash: string;
	readonly generatorPublicKey: string;

	readonly serialized?: string;
	readonly transactions: TransactionJson[];
}

export interface BlockCommit {
	readonly round: number;
	readonly signature: string;
	readonly validators: boolean[];
}

// TODO: clean up interfaces so we do not store everything in a redundant manner

export interface ProposedBlock {
	readonly block: Block;
	readonly lockProof?: AggregatedSignature;
	readonly serialized: string;
}

export interface ProposedBlockJson {
	readonly block: BlockJson;
	readonly lockProof?: AggregatedSignature;
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

export interface CommittedBlockJson {
	readonly block: BlockJson;
	readonly commit: BlockCommit;
	readonly serialized: string;
}

export type BlockDataSerializable = Omit<BlockData, "id">;
export type ProposedBlockSerializable = Omit<ProposedBlock, "serialized">;
export type CommittedBlockSerializable = Omit<CommittedBlock, "serialized">;

export interface BlockFactory {
	make(data: Mutable<BlockDataSerializable>): Promise<Block>;

	fromHex(hex: string): Promise<Block>;

	fromBytes(buff: Buffer): Promise<Block>;

	fromJson(json: BlockJson): Promise<Block>;

	fromData(data: BlockData): Promise<Block>;

	fromProposedBytes(buff: Buffer): Promise<ProposedBlock>;

	fromCommittedBytes(buff: Buffer): Promise<CommittedBlock>;

	fromCommittedJson(json: CommittedBlockJson): Promise<CommittedBlock>;
}

export interface BlockSerializer {
	headerSize(): number;

	commitSize(): number;

	lockProofSize(): number;

	totalSize(block: BlockDataSerializable): number;

	serializeHeader(block: BlockDataSerializable): Promise<Buffer>;

	serializeWithTransactions(block: BlockDataSerializable): Promise<Buffer>;

	serializeCommit(commit: BlockCommit): Promise<Buffer>;

	serializeLockProof(proof: AggregatedSignature): Promise<Buffer>;

	serializeProposed(proposedBlock: ProposedBlockSerializable): Promise<Buffer>;

	serializeFull(committedBlock: CommittedBlockSerializable): Promise<Buffer>;
}

export interface BlockWithTransactions {
	data: BlockData;
	transactions: Transaction[];
}

export interface BlockDeserializer {
	deserializeHeader(serialized: Buffer): Promise<BlockHeader>;

	deserializeWithTransactions(serialized: Buffer): Promise<BlockWithTransactions>;

	deserializeLockProof(serialized: Buffer): Promise<AggregatedSignature>;

	deserializeCommit(serialized: Buffer): Promise<BlockCommit>;
}

export interface BlockVerifier {
	verify(block: Block): Promise<BlockVerification>;
}

export interface CommitHandler {
	onCommit(unit: ProcessableUnit): Promise<void>;
}
