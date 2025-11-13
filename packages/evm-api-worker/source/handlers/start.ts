import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class StartHandler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-evm")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	public async handle(blockNumber: number): Promise<void> {
		this.store.setBlockNumber(blockNumber);

		if (this.configuration.get("server.http.enabled")) {
			await this.app.get<Contracts.Api.Server>(Identifiers.Evm.API.HTTP).boot();
		}

		if (this.configuration.get("server.https.enabled")) {
			await this.app.get<Contracts.Api.Server>(Identifiers.Evm.API.HTTPS).boot();
		}
	}
}
