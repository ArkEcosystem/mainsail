import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { BlockForger } from "./block-forger.js";
import { TransactionForger } from "./transaction-forger.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Forger.Transaction).to(TransactionForger).inSingletonScope();
		this.app.bind(Identifiers.Forger.Block).to(BlockForger).inSingletonScope();
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			txCollatorFactor: Joi.number().min(0).max(1).required(),
		}).unknown(true);
	}
}
