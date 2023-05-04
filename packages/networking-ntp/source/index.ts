import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Checker } from "./checker";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		//
	}

	public async boot(): Promise<void> {
		await this.app.resolve(Checker).execute();
	}

	public configSchema(): object {
		return Joi.object({
			hosts: Joi.array().items(Joi.string()).required(),
			timeout: Joi.number(),
		}).unknown(true);
	}
}
