import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { ValidationManager } from "./manager.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ValidationManager>(Identifiers.Services.Validation.Manager)
			.to(ValidationManager)
			.inSingletonScope();

		await this.app.get<ValidationManager>(Identifiers.Services.Validation.Manager).boot();

		this.app
			.bind(Identifiers.Services.Validation.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ValidationManager>(Identifiers.Services.Validation.Manager).driver(),
			);
	}
}
