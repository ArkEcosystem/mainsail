import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { QueueManager } from "./manager.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<QueueManager>(Identifiers.Services.Queue.Manager).to(QueueManager).inSingletonScope();

		this.app.bind<(name: string) => Promise<Contracts.Kernel.Queue>>(Identifiers.Services.Queue.Factory).toFactory(
			(context: Contracts.Kernel.Container.ResolutionContext) =>
				async (name?: string): Promise<Contracts.Kernel.Queue> =>
					context.get<QueueManager>(Identifiers.Services.Queue.Manager).driver<Contracts.Kernel.Queue>(name),
		);
	}
}
