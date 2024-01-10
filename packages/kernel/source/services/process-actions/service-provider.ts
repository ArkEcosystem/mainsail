import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { ProcessActionsManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ProcessActionsManager>(Identifiers.Kernel.ProcessActions.Manager)
			.to(ProcessActionsManager)
			.inSingletonScope();

		await this.app.get<ProcessActionsManager>(Identifiers.Kernel.ProcessActions.Manager).boot();

		this.app
			.bind(Identifiers.Kernel.ProcessActions.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ProcessActionsManager>(Identifiers.Kernel.ProcessActions.Manager).driver(),
			);
	}
}
