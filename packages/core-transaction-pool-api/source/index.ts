import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Handlers } from "./contracts";
import { registerHandlers } from "./handlers";
import { SubmitTransactionHandler } from "./handlers/submit";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Handlers.Store).to(SubmitTransactionHandler).inSingletonScope();

		this.app.bind(Identifiers.TransactionPoolServer).to(Server).inSingletonScope();

		// @TODO: tidy up
		registerHandlers(
			this.app,
			await this.app.get<Server>(Identifiers.TransactionPoolServer).initialize(this.config().all()),
		);
	}

	public async boot(): Promise<void> {
		await this.app.get<Server>(Identifiers.TransactionPoolServer).boot();
	}

	public async dispose(): Promise<void> {
		// await this.app.get<Server>(Identifiers.TransactionPoolServer).dispose();
	}
}
