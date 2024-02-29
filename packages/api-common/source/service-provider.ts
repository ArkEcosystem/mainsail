import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { AbstractServer } from "./server";
import { Schemas } from "./validation";

export type ServerConstructor<T extends AbstractServer> = new (...arguments_: any[]) => T;
export abstract class AbstractServiceProvider<T extends AbstractServer> extends Providers.ServiceProvider {
	protected abstract httpIdentifier(): symbol;
	protected abstract httpsIdentifier(): symbol;
	protected abstract getServerConstructor(): ServerConstructor<T>;
	protected abstract getHandlers(): any;
	protected abstract getPlugins(): any[];
	protected getActions(): Contracts.Api.RPC.Action[] {
		return [];
	}

	public async register(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.buildServer(Contracts.Api.ServerType.Http, this.httpIdentifier());
		}

		if (this.config().get("server.https.enabled")) {
			await this.buildServer(Contracts.Api.ServerType.Https, this.httpsIdentifier());
		}

		this.#registerValidation();
	}

	public async boot(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.app.get<T>(this.httpIdentifier()).boot();
		}

		if (this.config().get("server.https.enabled")) {
			await this.app.get<T>(this.httpsIdentifier()).boot();
		}
	}

	public async dispose(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.app.get<T>(this.httpIdentifier()).dispose();
		}

		if (this.config().get("server.https.enabled")) {
			await this.app.get<T>(this.httpsIdentifier()).dispose();
		}
	}

	public configSchema(): Joi.ObjectSchema {
		return Joi.object({
			plugins: Joi.object({
				pagination: Joi.object({
					limit: Joi.number().integer().min(0).required(),
				}).required(),
				socketTimeout: Joi.number().integer().min(0).required(),
				trustProxy: Joi.bool().required(),
				whitelist: Joi.array().items(Joi.string()).required(),
			}).required(),

			server: Joi.object({
				http: Joi.object({
					enabled: Joi.bool().required(),
					host: Joi.string().required(),
					port: Joi.number().integer().min(1).max(65_535).required(),
				}).required(),
				https: Joi.object({
					enabled: Joi.bool().required(),
					host: Joi.string().required(),
					port: Joi.number().integer().min(1).max(65_535).required(),
					tls: Joi.object({
						cert: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
						key: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
					}).required(),
				}).required(),
			}).required(),
		}).unknown(true);
	}

	protected async buildServer(type: Contracts.Api.ServerType, id: symbol): Promise<void> {
		this.app.bind<T>(id).to(this.getServerConstructor()).inSingletonScope();

		const server = this.app.get<T>(id);

		await server.initialize(type, {
			...this.config().get(`server.${type.toLowerCase()}`),

			routes: {
				cors: true,
			},
		});

		await server.register(this.getPlugins());

		await server.register({
			plugin: this.getHandlers(),
			routes: { prefix: "/api" },
		});

		for (const action of this.getActions()) {
			server.getRPCProcessor().registerAction(action);
		}
	}

	#registerValidation(): void {
		const validator = this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const schema of Object.values(Schemas)) {
			if (schema.$id && !validator.hasSchema(schema.$id)) {
				validator.addSchema(schema);
			}
		}
	}
}
