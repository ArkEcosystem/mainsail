import { interfaces } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { ProcessActionsManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ProcessActionsManager>(Identifiers.ProcessActionsManager)
			.to(ProcessActionsManager)
			.inSingletonScope();

		await this.app.get<ProcessActionsManager>(Identifiers.ProcessActionsManager).boot();

		this.app
			.bind(Identifiers.ProcessActionsService)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ProcessActionsManager>(Identifiers.ProcessActionsManager).driver(),
			);
	}
}
