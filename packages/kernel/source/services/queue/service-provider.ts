import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { QueueManager } from "./manager.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<QueueManager>(Identifiers.Services.Queue.Manager).to(QueueManager).inSingletonScope();

		this.app.bind(Identifiers.Services.Queue.Factory).toFactory(
			(context: interfaces.Context) =>
				async <K, T>(name?: string): Promise<Contracts.Kernel.Queue> =>
					context.container
						.get<QueueManager>(Identifiers.Services.Queue.Manager)
						.driver<Contracts.Kernel.Queue>(name),
		);
	}
}
