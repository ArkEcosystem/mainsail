import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { QueueManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<QueueManager>(Identifiers.QueueManager).to(QueueManager).inSingletonScope();

		this.app.bind(Identifiers.QueueFactory).toFactory(
			(context: interfaces.Context) =>
				async <K, T>(name?: string): Promise<Contracts.Kernel.Queue> =>
					context.container.get<QueueManager>(Identifiers.QueueManager).driver<Contracts.Kernel.Queue>(name),
		);
	}
}
