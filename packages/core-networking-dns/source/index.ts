import { Providers } from "@arkecosystem/core-kernel";
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
			hosts: Joi.array()
				.items(Joi.string().ip({ version: ["ipv4", "ipv6"] }))
				.required(),
		}).unknown(true);
	}
}
