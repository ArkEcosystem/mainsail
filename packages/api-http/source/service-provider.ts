import { Providers, Utils } from "@mainsail/kernel";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers, Repositories as ApiDatabaseRepositories } from "@mainsail/api-database";
import Joi from "joi";

import Handlers from "./handlers";
import { Identifiers as ApiIdentifiers } from "./identifiers";
import { preparePlugins } from "./plugins";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.configureDatabase();

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
			options: Joi.object({
				estimateTotalCount: Joi.bool().required(),
			}).required(),
			plugins: Joi.object({
				cache: Joi.object({
					checkperiod: Joi.number().integer().min(0).required(),
					enabled: Joi.bool().required(),
					stdTTL: Joi.number().integer().min(0).required(),
				}).required(),
				log: Joi.object({
					enabled: Joi.bool().required(),
				}).required(),
				pagination: Joi.object({
					limit: Joi.number().integer().min(0).required(),
				}).required(),
				rateLimit: Joi.object({
					blacklist: Joi.array().items(Joi.string()).required(),
					duration: Joi.number().integer().min(0).required(),
					enabled: Joi.bool().required(),
					points: Joi.number().integer().min(0).required(),
					whitelist: Joi.array().items(Joi.string()).required(),
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
			// TODO: schema
			database: Joi.object().required(),
		}).unknown(true);
	}

	private async configureDatabase(): Promise<void> {
		const options = this.config().get<ApiDatabaseContracts.PostgresConnectionOptions>("database");
		Utils.assert.defined<ApiDatabaseContracts.PostgresConnectionOptions>(options);

		try {
			const dataSource = await this.app.get<ApiDatabaseContracts.DatabaseFactory>(ApiDatabaseIdentifiers.Factory).make(options);

			this.app.bind(ApiIdentifiers.DataSource).toConstantValue(dataSource);
			this.app.bind(ApiIdentifiers.BlockRepository).toConstantValue(
				ApiDatabaseRepositories.makeBlockRepository(dataSource)
			);
			this.app.bind(ApiIdentifiers.TransactionRepository).toConstantValue(
				ApiDatabaseRepositories.makeTransactionRepository(dataSource)
			);

		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}

	private async buildServer(type: string, id: symbol): Promise<void> {
		this.app.bind<Server>(id).to(Server).inSingletonScope();

		const server: Server = this.app.get<Server>(id);

		await server.initialize(`Public API (${type.toUpperCase()})`, {
			...this.config().get(`server.${type}`),

			routes: {
				cors: true,
			},
		});

		await server.register(preparePlugins(this.config().get("plugins")));

		await server.register({
			plugin: Handlers,
			routes: { prefix: "/api" },
		});
	}
}
