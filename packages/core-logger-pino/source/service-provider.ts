import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { PinoLogger } from "./driver";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logManager: Services.Log.LogManager = this.app.get<Services.Log.LogManager>(Identifiers.LogManager);

		await logManager.extend("pino", async () =>
			this.app.resolve<Contracts.Kernel.Logger>(PinoLogger).make(this.config().all()),
		);

		logManager.setDefaultDriver("pino");
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Kernel.Logger>(Identifiers.LogService).dispose();
	}

	public configSchema(): object {
		return Joi.object({
			fileRotator: Joi.object({
				interval: Joi.string().required(),
			}).required(),
			levels: Joi.object({
				console: Joi.string().required(),
				file: Joi.string().required(),
			}).required(),
		}).unknown(true);
	}
}
