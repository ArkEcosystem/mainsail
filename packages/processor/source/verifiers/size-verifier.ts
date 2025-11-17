import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { InvalidPayloadSize, MaxPayloadExceeded } from "@mainsail/exceptions";

@injectable()
export class SizeVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { maxPayload } = this.configuration.getMilestone().block;
		const block = unit.getBlock();

		const totalSize = this.headerSize() + block.header.payloadSize;
		if (totalSize > maxPayload) {
			throw new MaxPayloadExceeded(block, totalSize, maxPayload);
		}

		const actualSize = Buffer.byteLength(block.serialized, "hex");
		if (totalSize !== actualSize) {
			throw new InvalidPayloadSize(block, totalSize, actualSize);
		}

		let totalPayloadLength = block.transactions.length * 4;
		for (const transaction of block.transactions) {
			totalPayloadLength += transaction.serialized.byteLength;
		}

		if (totalPayloadLength !== block.data.payloadSize) {
			throw new InvalidPayloadSize(block, totalSize, totalPayloadLength);
		}
	}
}
