import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Database } from "./database.js";
import { InternalIdentifiers } from "./identifiers.js";
import { Listener } from "./listener.js";
import { Server } from "./server/index.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Setup Database...
		this.app.bind<Database>(InternalIdentifiers.Database).to(Database).inSingletonScope();

		this.app.get<Database>(InternalIdentifiers.Database).boot();

		// Setup Server...
		this.app.bind(InternalIdentifiers.Server).to(Server).inSingletonScope();

		await this.app
			.get<Server>(InternalIdentifiers.Server)
			.register(this.config().get<Contracts.Types.JsonObject>("server")!);

		// Setup Listeners...
		this.#startListeners();
	}

	public async boot(): Promise<void> {
		await this.app.get<any>(InternalIdentifiers.Server).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<any>(InternalIdentifiers.Server).dispose();
	}

	public async bootWhen(): Promise<boolean> {
		return this.config().get("enabled") === true;
	}

	public configSchema(): object {
		return Joi.object({
			enabled: Joi.boolean().required(),
			server: Joi.object({
				http: Joi.object({
					host: Joi.string()
						.ip({ version: ["ipv4", "ipv6"] })
						.required(),
					port: Joi.number().integer().min(1).max(65_535).required(),
				}).required(),
				whitelist: Joi.array().items(Joi.string()).required(),
			}).required(),
			timeout: Joi.number().integer().min(1).required(),
		}).unknown(true);
	}

	#startListeners(): void {
		this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.listen("*", this.app.resolve(Listener));
	}
}
