import { Providers } from "@mainsail/kernel";
import Joi from "joi";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): object {
		return Joi.object({
			blacklist: Joi.array().items(Joi.string()).required(),
			whitelist: Joi.array().items(Joi.string()).required(),
		}).unknown(true);
	}
}
