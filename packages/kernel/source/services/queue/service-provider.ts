import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { QueueManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<QueueManager>(Identifiers.Kernel.Queue.Manager).to(QueueManager).inSingletonScope();

		this.app.bind(Identifiers.Kernel.Queue.Factory).toFactory(
			(context: interfaces.Context) =>
				async <K, T>(name?: string): Promise<Contracts.Kernel.Queue> =>
					context.container
						.get<QueueManager>(Identifiers.Kernel.Queue.Manager)
						.driver<Contracts.Kernel.Queue>(name),
		);
	}
}
