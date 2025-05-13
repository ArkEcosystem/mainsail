import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { LogManager } from "./manager.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<LogManager>(Identifiers.Services.Log.Manager).to(LogManager).inSingletonScope();

		await this.app.get<LogManager>(Identifiers.Services.Log.Manager).boot();

		this.app
			.bind(Identifiers.Services.Log.Service)
			.toDynamicValue((context: Contracts.Kernel.Container.ResolutionContext) =>
				context.get<LogManager>(Identifiers.Services.Log.Manager).driver(),
			);
	}
}
