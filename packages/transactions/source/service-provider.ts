import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { TransactionHandler } from "./transaction.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Transaction.Handler).to(TransactionHandler);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
