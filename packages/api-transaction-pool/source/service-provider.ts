import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import Handlers from "./handlers";
import { Identifiers as ApiIdentifiers } from "./identifiers";
// import { preparePlugins } from "./plugins";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.buildServer("http", ApiIdentifiers.HTTP);
		}

		if (this.config().get("server.https.enabled")) {
			await this.buildServer("https", ApiIdentifiers.HTTPS);
		}
	}

	public async boot(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.app.get<Server>(ApiIdentifiers.HTTP).boot();
		}

		if (this.config().get("server.https.enabled")) {
			await this.app.get<Server>(ApiIdentifiers.HTTPS).boot();
		}
	}

	public async dispose(): Promise<void> {
		if (this.config().get("server.http.enabled")) {
			await this.app.get<Server>(ApiIdentifiers.HTTP).dispose();
		}

		if (this.config().get("server.https.enabled")) {
			await this.app.get<Server>(ApiIdentifiers.HTTPS).dispose();
		}
	}

	public configSchema(): object {
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

	private async buildServer(type: string, id: symbol): Promise<void> {
		this.app.bind<Server>(id).to(Server).inSingletonScope();

		const server: Server = this.app.get<Server>(id);

		await server.initialize(`Transaction Pool API (${type.toUpperCase()})`, {
			...this.config().get(`server.${type}`),

			routes: {
				cors: true,
			},
		});

		//		await server.register(preparePlugins(this.config().get("plugins")));

		await server.register({
			plugin: Handlers,
			routes: { prefix: "/api" },
		});
	}
}
