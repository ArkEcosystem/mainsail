import type { Enums } from "@mainsail/constants";

import type { KeyPair } from "./identities.js";
export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
}

export type HasBlockHash = { blockHash: string };
export type WithoutBlockHash<T> = Omit<T, "blockHash">;
export type WithOptionalBlockHash<T extends HasBlockHash> = WithoutBlockHash<T> & Partial<Pick<T, "blockHash">>;

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
export type MakeMessageData = WithoutSignature<MessageData>;

export interface MessageFactory {
	makeMessage(data: MakeMessageData, keyPair: KeyPair): Promise<Message>;
	makeMessageFromBytes(data: Buffer): Promise<Message>;
	makeMessageFromData(data: MessageData): Promise<Message>;
}

export interface MessageSerializer {
	serializeMessage(message: MessageData): Promise<Buffer>;
	serializeMessageForSignature(message: SignatureMessageData): Promise<Buffer>;
}

export interface MessageDeserializer {
	deserializeMessage(serialized: Buffer): Promise<MessageData>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
