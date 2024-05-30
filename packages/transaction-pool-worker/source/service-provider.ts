import { Providers } from "@mainsail/kernel";
import Joi from "joi";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {}

	public configSchema(): Joi.AnySchema {
		return Joi.object({}).required().unknown(true);
	}
}
