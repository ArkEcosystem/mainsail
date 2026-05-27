import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { MessageDeserializationError } from "@mainsail/exceptions";
import { ByteBuffer, ensureError } from "@mainsail/utils";

import { schema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.MessageDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	public async deserializeMessage(serialized: Buffer): Promise<Contracts.Crypto.MessageData> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		try {
			const result = await this.serializer.deserialize<Contracts.Crypto.MessageData>(
				buffer,
				{},
				{
					schema,
				},
			);

			if (buffer.getRemainderLength() === 0) {
				return result;
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			throw new MessageDeserializationError(error instanceof Error ? error.message : "");
		}

		throw new MessageDeserializationError(`${buffer.getRemainderLength()} bytes remaining`);
	}
}
