import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

interface Server {
	boot(): Promise<void>;
}

@injectable()
export class StartHandler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	protected readonly store!: Contracts.State.Store;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-transaction-pool")
	private readonly configuration!: Providers.PluginConfiguration;

	public async handle(height: number): Promise<void> {
		this.store.setHeight(height);
		await this.transactionPoolService.reAddTransactions();

		if (this.configuration.get("server.http.enabled")) {
			await this.app.get<Server>(Identifiers.TransactionPool.API.HTTP).boot();
		}

		if (this.configuration.get("server.https.enabled")) {
			await this.app.get<Server>(Identifiers.TransactionPool.API.HTTPS).boot();
		}
	}
}
