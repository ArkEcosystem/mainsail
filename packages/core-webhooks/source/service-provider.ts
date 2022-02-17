import { Container, Contracts, Providers, Types } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { Database } from "./database";
import { Identifiers } from "./identifiers";
import { Listener } from "./listener";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Setup Database...
		this.app.bind<Database>(Identifiers.Database).to(Database).inSingletonScope();

		this.app.get<Database>(Identifiers.Database).boot();

		// Setup Server...
		this.app.bind(Identifiers.Server).to(Server).inSingletonScope();

		this.app.get<Server>(Identifiers.Server).register(this.config().get<Types.JsonObject>("server")!);

		// Setup Listeners...
		this.startListeners();
	}

	public async boot(): Promise<void> {
		await this.app.get<any>(Identifiers.Server).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<any>(Identifiers.Server).dispose();
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
					port: Joi.number().integer().min(1).max(65535).required(),
				}).required(),
				whitelist: Joi.array().items(Joi.string()).required(),
			}).required(),
			timeout: Joi.number().integer().min(1).required(),
		}).unknown(true);
	}

	private startListeners(): void {
		this.app
			.get<Contracts.Kernel.EventDispatcher>(Container.Identifiers.EventDispatcherService)
			.listen("*", this.app.resolve(Listener));
	}
}
