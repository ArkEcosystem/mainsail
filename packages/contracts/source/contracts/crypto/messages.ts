import type { Enums } from "@mainsail/constants";

import type { KeyPair } from "./identities.js";
export type MessageType = Enums.Crypto.MessageType;

export interface SignatureMessageData {
	readonly type: MessageType;
	readonly blockNumber: number;
	readonly round: number;
	readonly blockHash?: string;
}

export interface SignatureMessageContext {
	readonly genesisBlockHash: string;
	readonly previousBlockHash: string;
}

export interface MakeMessageData extends SignatureMessageData {
	readonly validatorIndex: number;
}

export interface MessageData extends MakeMessageData {
	readonly signature: string;
}

export interface Message extends MessageData {
	readonly serialized: Buffer;
	toString(): string;
}

export interface MessageFactory {
	makeMessage(
		data: MakeMessageData,
		keyPair: KeyPair,
		context: SignatureMessageContext,
	): Promise<Message>;
	makeMessageFromBytes(data: Buffer): Promise<Message>;
}

export interface MessageSerializer {
	serializeMessage(message: MessageData): Promise<Buffer>;
	serializeMessageForSignature(
		message: SignatureMessageData,
		context: SignatureMessageContext,
	): Promise<Buffer>;
}

export interface MessageDeserializer {
	deserializeMessage(serialized: Buffer): Promise<MessageData>;
}

export interface MessageVerificationResult {
	readonly verified: boolean;
	readonly errors: string[];
}
