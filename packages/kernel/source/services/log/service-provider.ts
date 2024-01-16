import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { LogManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<LogManager>(Identifiers.Services.Log.Manager).to(LogManager).inSingletonScope();

		await this.app.get<LogManager>(Identifiers.Services.Log.Manager).boot();

		this.app
			.bind(Identifiers.Services.Log.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<LogManager>(Identifiers.Services.Log.Manager).driver(),
			);
	}
}
