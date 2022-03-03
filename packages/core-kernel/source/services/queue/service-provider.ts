import { interfaces } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { QueueManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<QueueManager>(Identifiers.QueueManager).to(QueueManager).inSingletonScope();

		this.app.bind(Identifiers.QueueFactory).toFactory(
			(context: interfaces.Context) =>
				async <K, T>(name?: string): Promise<Kernel.Queue> =>
					context.container.get<QueueManager>(Identifiers.QueueManager).driver<Kernel.Queue>(name),
		);
	}
}
