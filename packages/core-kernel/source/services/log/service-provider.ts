import { interfaces } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { LogManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<LogManager>(Identifiers.LogManager).to(LogManager).inSingletonScope();

		await this.app.get<LogManager>(Identifiers.LogManager).boot();

		this.app
			.bind(Identifiers.LogService)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<LogManager>(Identifiers.LogManager).driver(),
			);
	}
}
