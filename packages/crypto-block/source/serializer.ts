import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { blockHeaderSchema, blockSchema } from "./serializer-schemas.js";

@injectable()
export class Serializer implements Contracts.Crypto.BlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	public totalSize(block: Contracts.Crypto.BlockHeaderRaw): number {
		return this.headerSize() + block.payloadSize;
	}

	public async serializeHeader(header: Contracts.Crypto.BlockHeaderRaw): Promise<Buffer> {
		return this.serializer.serialize(header, {
			length: this.headerSize(),
			schema: blockHeaderSchema,
			skip: 0,
		});
	}

	public async serializeWithTransactions(block: Contracts.Crypto.BlockSerializable): Promise<Buffer> {
		return this.serializer.serialize(block, {
			length: this.totalSize(block),
			schema: blockSchema,
			skip: 0,
		});
	}
}
