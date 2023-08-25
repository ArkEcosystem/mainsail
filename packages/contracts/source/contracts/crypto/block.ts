import { BigNumber } from "@mainsail/utils";

import { Mutable } from "../../utils";
import { IAggregatedSignature } from "./signatures";
import { ITransaction, ITransactionData, ITransactionJson } from "./transactions";

export interface IBlockVerification {
	readonly verified: boolean;
	readonly errors: string[];
	readonly containsMultiSignatures: boolean;
}

export type IBlockHeader = Exclude<IBlockData, "transactions">;

export interface IBlock {
	readonly data: IBlockData;
	readonly header: IBlockHeader;
	readonly serialized: string;
	readonly transactions: ITransaction[];
}

export interface IBlockData {
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
	readonly transactions: ITransactionData[];
}

export interface IBlockJson {
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
	readonly transactions: ITransactionJson[];
}

export interface IBlockCommit {
	readonly round: number;
	readonly signature: string;
	readonly validators: boolean[];
}

// TODO: clean up interfaces so we do not store everything in a redundant manner

export interface IProposedBlock {
	readonly block: IBlock;
	readonly lockProof?: IAggregatedSignature;
	readonly serialized: string;
}

export interface IProposedBlockJson {
	readonly block: IBlockJson;
	readonly lockProof?: IAggregatedSignature;
	readonly serialized: string;
}

export interface ICommittedBlock {
	readonly block: IBlock;
	readonly commit: IBlockCommit;
	readonly serialized: string;
}

export interface ICommittedBlockData {
	readonly block: IBlockData;
	readonly commit: IBlockCommit;
	readonly serialized: string;
}

export interface ICommittedBlockJson {
	readonly block: IBlockJson;
	readonly commit: IBlockCommit;
	readonly serialized: string;
}

export type IBlockDataSerializable = Omit<IBlockData, "id">;
export type IProposedBlockSerializable = Omit<IProposedBlock, "serialized">;
export type ICommittedBlockSerializable = Omit<ICommittedBlock, "serialized">;

export interface IBlockFactory {
	make(data: Mutable<IBlockDataSerializable>): Promise<IBlock>;

	fromHex(hex: string): Promise<IBlock>;

	fromBytes(buff: Buffer): Promise<IBlock>;

	fromJson(json: IBlockJson): Promise<IBlock>;

	fromData(data: IBlockData): Promise<IBlock>;

	fromProposedBytes(buff: Buffer): Promise<IProposedBlock>;

	fromProposedJson(json: IProposedBlockJson): Promise<IProposedBlock>;

	fromCommittedBytes(buff: Buffer): Promise<ICommittedBlock>;

	fromCommittedJson(json: ICommittedBlockJson): Promise<ICommittedBlock>;
}

export interface IBlockSerializer {
	headerSize(): number;

	commitSize(): number;

	lockProofSize(): number;

	totalSize(block: IBlockDataSerializable): number;

	serializeHeader(block: IBlockDataSerializable): Promise<Buffer>;

	serializeWithTransactions(block: IBlockDataSerializable): Promise<Buffer>;

	serializeCommit(commit: IBlockCommit): Promise<Buffer>;

	serializeLockProof(proof: IAggregatedSignature): Promise<Buffer>;

	serializeProposed(proposedBlock: IProposedBlockSerializable): Promise<Buffer>;

	serializeFull(committedBlock: ICommittedBlockSerializable): Promise<Buffer>;
}

export interface IBlockWithTransactions {
	data: IBlockData;
	transactions: ITransaction[];
}

export interface IBlockDeserializer {
	deserializeHeader(serialized: Buffer): Promise<IBlockHeader>;

	deserializeWithTransactions(serialized: Buffer): Promise<IBlockWithTransactions>;

	deserializeLockProof(serialized: Buffer): Promise<IAggregatedSignature>;

	deserializeCommit(serialized: Buffer): Promise<IBlockCommit>;
}

export interface IBlockVerifier {
	verify(block: IBlock): Promise<IBlockVerification>;
}
