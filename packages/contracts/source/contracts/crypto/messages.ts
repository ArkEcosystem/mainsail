import type { Enums } from "@mainsail/constants";

import type { KeyPair } from "./identities.js";
export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash: string;
}

export type HasBlockHash = { blockHash: string };
export type WithoutBlockHash<T> = Omit<T, "blockHash">;
export type WithOptionalBlockHash<T extends HasBlockHash> = WithoutBlockHash<T> & Partial<Pick<T, "blockHash">>;
export type SignaturePrevoteData = WithOptionalBlockHash<SignatureMessageData>;
export type SignaturePrecommitData = WithOptionalBlockHash<SignatureMessageData>;

export interface PrevoteData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Prevote extends PrevoteData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrevoteData;
	toString(): string;
}

export interface PrecommitData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
	readonly validatorIndex: number;
	readonly signature: string;
}

export interface Precommit extends PrecommitData {
	readonly serialized: Buffer;

	toSignatureData(): SignaturePrecommitData;
	toString(): string;
}

export type HasSignature = { signature: string };
export type WithoutSignature<T> = Omit<T, "signature">;
export type OptionalSignature<T extends HasSignature> = WithoutSignature<T> & Partial<Pick<T, "signature">>;
export type MakePrevoteData = WithoutSignature<PrevoteData>;
export type MakePrecommitData = WithoutSignature<PrecommitData>;

export interface MessageFactory {
	makePrevote(data: MakePrevoteData, keyPair: KeyPair): Promise<Prevote>;
	makePrevoteFromBytes(data: Buffer): Promise<Prevote>;
	makePrevoteFromData(data: PrevoteData): Promise<Prevote>;
	makePrecommit(data: MakePrecommitData, keyPair: KeyPair): Promise<Precommit>;
	makePrecommitFromBytes(data: Buffer): Promise<Precommit>;
	makePrecommitFromData(data: PrecommitData): Promise<Precommit>;
}

export interface MessageSerializer {
	serializePrevote(prevote: PrevoteData): Promise<Buffer>;
	serializePrevoteForSignature(prevote: SignaturePrevoteData): Promise<Buffer>;
	serializePrecommit(precommit: PrecommitData): Promise<Buffer>;
	serializePrecommitForSignature(precommit: SignaturePrecommitData): Promise<Buffer>;
}

export interface MessageDeserializer {
	deserializePrevote(serialized: Buffer): Promise<PrevoteData>;
	deserializePrecommit(serialized: Buffer): Promise<PrecommitData>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
