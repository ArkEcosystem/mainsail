import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { Providers, Services } from "@mainsail/core-kernel";
import Joi from "joi";

import { Logger } from "./driver";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logManager: Services.Log.LogManager = this.app.get<Services.Log.LogManager>(Identifiers.LogManager);

		await logManager.extend("winston", async () =>
			this.app.resolve<Contracts.Kernel.Logger>(Logger).make(this.config().all()),
		);

		logManager.setDefaultDriver("winston");
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Kernel.Logger>(Identifiers.LogService).dispose();
	}

	public configSchema(): object {
		return Joi.object({
			levels: Joi.object({
				console: Joi.string().required(),
				file: Joi.string().required(),
			}).required(),
		}).unknown(true);
	}
}
