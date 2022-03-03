import { Providers, Types } from "@arkecosystem/core-kernel";
import Joi from "joi";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Database } from "./database";
import { InternalIdentifiers } from "./identifiers";
import { Listener } from "./listener";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Setup Database...
		this.app.bind<Database>(InternalIdentifiers.Database).to(Database).inSingletonScope();

		this.app.get<Database>(InternalIdentifiers.Database).boot();

		// Setup Server...
		this.app.bind(InternalIdentifiers.Server).to(Server).inSingletonScope();

		this.app.get<Server>(InternalIdentifiers.Server).register(this.config().get<Types.JsonObject>("server")!);

		// Setup Listeners...
		this.startListeners();
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

	private startListeners(): void {
		this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
			.listen("*", this.app.resolve(Listener));
	}
}
