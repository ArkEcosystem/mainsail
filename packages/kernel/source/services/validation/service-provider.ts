import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { ValidationManager } from "./manager.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ValidationManager>(Identifiers.Services.Validation.Manager)
			.to(ValidationManager)
			.inSingletonScope();

		await this.app.get<ValidationManager>(Identifiers.Services.Validation.Manager).boot();

		this.app
			.bind(Identifiers.Services.Validation.Service)
			.toDynamicValue((context: Contracts.Kernel.Container.ResolutionContext) =>
				context.get<ValidationManager>(Identifiers.Services.Validation.Manager).driver(),
			);
	}
}
