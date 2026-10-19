import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidTransactionsRoot } from "@mainsail/exceptions";

@injectable()
export class TransactionsRootVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const payloadBuffers: Buffer[] = [];

		for (const transaction of block.transactions) {
			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
		}

		const transactionsRoot = this.hashFactory.sha256(payloadBuffers);
		if (transactionsRoot.toString("hex") !== block.transactionsRoot) {
			throw new InvalidTransactionsRoot(block, transactionsRoot.toString("hex"));
		}
	}
}
