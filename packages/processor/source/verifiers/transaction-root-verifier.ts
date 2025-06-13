import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionsRootVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const payloadBuffers: Buffer[] = [];

		for (const transaction of block.transactions) {
			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
		}

		const transactionsRoot = await this.hashFactory.sha256(payloadBuffers);
		if (transactionsRoot.toString("hex") !== block.data.transactionsRoot) {
			throw new Exceptions.InvalidTransactionsRoot(block, transactionsRoot.toString("hex"));
		}
	}
}
