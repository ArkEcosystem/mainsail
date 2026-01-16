import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Listeners } from "./listeners.js";
import { TokenParserService } from "./parsers/tokens.js";
import { Sync } from "./service.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		if (!this.#isEnabled()) {
			return;
		}

		this.app.bind(Identifiers.ApiSync.TokenParser).to(TokenParserService).inSingletonScope();
		this.app.bind(Identifiers.ApiSync.Listener).to(Listeners).inSingletonScope();
		this.app.bind(Identifiers.ApiSync.Service).to(Sync).inSingletonScope();

		// Listen to events during register, so we can catch all boot events.
		await this.app.get<Listeners>(Identifiers.ApiSync.Listener).register();
	}

	public async dispose(): Promise<void> {
		if (!this.#isEnabled()) {
			return;
		}

		await this.app.get<Listeners>(Identifiers.ApiSync.Listener).dispose();
	}

	public configSchema(): Joi.ObjectSchema {
		return Joi.object({
			syncInterval: Joi.number().integer().positive().required(),
			tokenCacheSize: Joi.number().integer().positive().required(),
		}).unknown(true);
	}

	#isEnabled(): boolean {
		return this.config().getRequired<boolean>("enabled") === true && !this.app.isWorker();
	}
}
