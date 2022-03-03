import { interfaces } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { ValidationManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<ValidationManager>(Identifiers.ValidationManager).to(ValidationManager).inSingletonScope();

		await this.app.get<ValidationManager>(Identifiers.ValidationManager).boot();

		this.app
			.bind(Identifiers.ValidationService)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<ValidationManager>(Identifiers.ValidationManager).driver(),
			);
	}
}
