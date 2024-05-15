import { Providers } from "@mainsail/kernel";
import Joi from "joi";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {}

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
