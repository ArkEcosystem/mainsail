import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { ValidationManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ValidationManager>(Identifiers.Kernel.Validation.Manager)
			.to(ValidationManager)
			.inSingletonScope();

		await this.app.get<ValidationManager>(Identifiers.Kernel.Validation.Manager).boot();

		this.app
			.bind(Identifiers.Kernel.Validation.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ValidationManager>(Identifiers.Kernel.Validation.Manager).driver(),
			);
	}
}
