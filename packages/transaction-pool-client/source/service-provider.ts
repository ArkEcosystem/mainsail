import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Client } from "./client.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.TransactionPoolClient.Instance).to(Client).inSingletonScope();
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			export: Joi.object({
				host: Joi.string().required(),
				port: Joi.number().integer().min(1).max(65_535).required(),
			}).required(),
		})
			.required()
			.unknown(true);
	}
}
