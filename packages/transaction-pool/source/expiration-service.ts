import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ExpirationService implements Contracts.TransactionPool.ExpirationService {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	public canExpire(transaction: Contracts.Crypto.ITransaction): boolean {
		return !!transaction.data.expiration;
	}

	public async isExpired(transaction: Contracts.Crypto.ITransaction): Promise<boolean> {
		if (this.canExpire(transaction)) {
			return (
				(await this.getExpirationHeight(transaction)) <= this.stateService.getStateStore().getLastHeight() + 1
			);
		}

		return false;
	}

	public async getExpirationHeight(transaction: Contracts.Crypto.ITransaction): Promise<number> {
		Utils.assert.defined<number>(transaction.data.expiration);

		return transaction.data.expiration;
	}
}
