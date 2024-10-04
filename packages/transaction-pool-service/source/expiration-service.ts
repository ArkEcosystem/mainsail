import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ExpirationService implements Contracts.TransactionPool.ExpirationService {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public canExpire(transaction: Contracts.Crypto.Transaction): boolean {
		return !!transaction.data.expiration;
	}

	public async isExpired(transaction: Contracts.Crypto.Transaction): Promise<boolean> {
		if (this.canExpire(transaction)) {
			return (await this.getExpirationHeight(transaction)) <= this.stateStore.getHeight() + 1;
		}

		return false;
	}

	public async getExpirationHeight(transaction: Contracts.Crypto.Transaction): Promise<number> {
		Utils.assert.defined<number>(transaction.data.expiration);

		return transaction.data.expiration;
	}
}
