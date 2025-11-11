import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { TransactionHandler } from "./handlers/index.js";
import { TransactionValidator } from "./transaction-validator.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Transaction.Validator.Instance).to(TransactionValidator);

		this.app.bind(Identifiers.Transaction.Handler).to(TransactionHandler);

		this.app
			.bind<() => TransactionValidator>(Identifiers.Transaction.Validator.Factory)
			.toFactory(
				(context: Contracts.Kernel.Container.ResolutionContext) => () =>
					context.get(Identifiers.Transaction.Validator.Instance),
			);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
