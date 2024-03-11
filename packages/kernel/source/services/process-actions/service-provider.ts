import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { ProcessActionsManager } from "./manager.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ProcessActionsManager>(Identifiers.Services.ProcessActions.Manager)
			.to(ProcessActionsManager)
			.inSingletonScope();

		await this.app.get<ProcessActionsManager>(Identifiers.Services.ProcessActions.Manager).boot();

		this.app
			.bind(Identifiers.Services.ProcessActions.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ProcessActionsManager>(Identifiers.Services.ProcessActions.Manager).driver(),
			);
	}
}
