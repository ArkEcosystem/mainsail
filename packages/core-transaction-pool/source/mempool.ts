import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { injectable, inject } from "@arkecosystem/core-container";

@injectable()
export class Mempool implements Contracts.TransactionPool.Mempool {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPoolSenderMempoolFactory)
	private readonly createSenderMempool!: Contracts.TransactionPool.SenderMempoolFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly addressFactory: Crypto.IAddressFactory;

	private readonly senderMempools = new Map<string, Contracts.TransactionPool.SenderMempool>();

	public getSize(): number {
		return [...this.senderMempools.values()].reduce((sum, p) => sum + p.getSize(), 0);
	}

	public hasSenderMempool(senderPublicKey: string): boolean {
		return this.senderMempools.has(senderPublicKey);
	}

	public getSenderMempool(senderPublicKey: string): Contracts.TransactionPool.SenderMempool {
		const senderMempool = this.senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			throw new Error("Unknown sender");
		}
		return senderMempool;
	}

	public getSenderMempools(): Iterable<Contracts.TransactionPool.SenderMempool> {
		return this.senderMempools.values();
	}

	public async addTransaction(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		let senderMempool = this.senderMempools.get(transaction.data.senderPublicKey);
		if (!senderMempool) {
			senderMempool = this.createSenderMempool();
			this.senderMempools.set(transaction.data.senderPublicKey, senderMempool);
			this.logger.debug(
				`${await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey)} state created`,
			);
		}

		try {
			await senderMempool.addTransaction(transaction);
		} finally {
			if (senderMempool.isDisposable()) {
				this.senderMempools.delete(transaction.data.senderPublicKey);
				this.logger.debug(
					`${await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey)} state disposed`,
				);
			}
		}
	}

	public async removeTransaction(senderPublicKey: string, id: string): Promise<Crypto.ITransaction[]> {
		const senderMempool = this.senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			return [];
		}

		try {
			return await senderMempool.removeTransaction(id);
		} finally {
			if (senderMempool.isDisposable()) {
				this.senderMempools.delete(senderPublicKey);
				this.logger.debug(`${await this.addressFactory.fromPublicKey(senderPublicKey)} state disposed`);
			}
		}
	}

	public async removeForgedTransaction(senderPublicKey: string, id: string): Promise<Crypto.ITransaction[]> {
		const senderMempool = this.senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			return [];
		}

		try {
			return await senderMempool.removeForgedTransaction(id);
		} finally {
			if (senderMempool.isDisposable()) {
				this.senderMempools.delete(senderPublicKey);
				this.logger.debug(`${await this.addressFactory.fromPublicKey(senderPublicKey)} state disposed`);
			}
		}
	}

	public flush(): void {
		this.senderMempools.clear();
	}
}
