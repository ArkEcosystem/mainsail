import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	public readonly name: string = "commit";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		try {
			const store = this.stateService.createStoreClone();

			store.applyChanges(parameters.store);
			store.commitChanges();

			this.configuration.setHeight(store.getLastHeight() + 1);

			for (const transactionId of parameters.failedTransactions) {
				await this.transactionPoolService.removeTransaction(transactionId);
			}
		} catch (error) {
			throw new Error(`Cannot process changes, because: ${error.message}`);
		}

		return { success: true };
	}
}
