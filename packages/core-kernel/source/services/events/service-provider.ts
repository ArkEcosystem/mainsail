import { interfaces } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { EventDispatcherManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<EventDispatcherManager>(Identifiers.EventDispatcherManager)
			.to(EventDispatcherManager)
			.inSingletonScope();

		await this.app.get<EventDispatcherManager>(Identifiers.EventDispatcherManager).boot();

		this.app
			.bind(Identifiers.EventDispatcherService)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<EventDispatcherManager>(Identifiers.EventDispatcherManager).driver(),
			);
	}
}
