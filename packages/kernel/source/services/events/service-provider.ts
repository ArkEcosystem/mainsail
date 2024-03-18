import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { EventDispatcherManager } from "./manager.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<EventDispatcherManager>(Identifiers.Services.EventDispatcher.Manager)
			.to(EventDispatcherManager)
			.inSingletonScope();

		await this.app.get<EventDispatcherManager>(Identifiers.Services.EventDispatcher.Manager).boot();

		this.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<EventDispatcherManager>(Identifiers.Services.EventDispatcher.Manager).driver(),
			);
	}
}
