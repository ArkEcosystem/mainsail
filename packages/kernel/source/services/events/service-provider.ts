import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { EventDispatcherManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<EventDispatcherManager>(Identifiers.Kernel.EventDispatcher.Manager)
			.to(EventDispatcherManager)
			.inSingletonScope();

		await this.app.get<EventDispatcherManager>(Identifiers.Kernel.EventDispatcher.Manager).boot();

		this.app
			.bind(Identifiers.Kernel.EventDispatcher.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<EventDispatcherManager>(Identifiers.Kernel.EventDispatcher.Manager).driver(),
			);
	}
}
