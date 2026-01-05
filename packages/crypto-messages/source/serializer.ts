import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { messageSchema, messageSchemaForSignature } from "./serializer-schemas.js";

@injectable()
export class Serializer implements Contracts.Crypto.MessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Hash.Size.SHA256)
	private readonly hashSize!: number;

	public async serializeMessage(message: Contracts.Crypto.MessageData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.MessageData>(message, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 + // validatorIndex
				1 +
				(message.blockHash ? this.hashSize : 0) + // blockHash
				this.signatureSize, // signature
			schema: messageSchema,
			skip: 0,
		});
	}

	public async serializeMessageForSignature(message: Contracts.Crypto.SignatureMessageData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignatureMessageData>(message, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 +
				(message.blockHash ? this.hashSize : 0), // blockHash
			schema: messageSchemaForSignature,
			skip: 0,
		});
	}
}
