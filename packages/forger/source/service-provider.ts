import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { BlockForger } from "./block-forger.js";
import { TransactionValidator } from "./transaction-validator.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Forger.Block).to(BlockForger).inSingletonScope();

		this.app.bind(Identifiers.Transaction.Validator.Instance).to(TransactionValidator);

		this.app
			.bind<() => TransactionValidator>(Identifiers.Transaction.Validator.Factory)
			.toFactory(
				(context: Contracts.Kernel.Container.ResolutionContext) => () =>
					context.get(Identifiers.Transaction.Validator.Instance),
			);
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			txCollatorFactor: Joi.number().min(0).max(1).required(),
		}).unknown(true);
	}
}
