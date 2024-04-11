import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import Joi from "joi";

import { Logger } from "./driver.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logManager: Services.Log.LogManager = this.app.get<Services.Log.LogManager>(
			Identifiers.Services.Log.Manager,
		);

		await logManager.extend("winston", async () => this.app.resolve<Logger>(Logger).make(this.config().all()));

		logManager.setDefaultDriver("winston");
	}

	public requiredByWorker(): boolean {
		return true;
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).dispose();
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
