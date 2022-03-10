import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.P2P.Server).to(Server).inSingletonScope();

		await this.app.get<Server>(Identifiers.P2P.Server).register(this.config().all() as any);
	}

	public async boot(): Promise<void> {
		await this.app.get<Server>(Identifiers.P2P.Server).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Server>(Identifiers.P2P.Server).dispose();
	}

	public configSchema(): object {
		return Joi.object().unknown(true);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
