import { ConfigurationGenerator, makeApplication } from "@arkecosystem/core-configuration-generator";
import { Container, interfaces } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Application, Providers, Types } from "@arkecosystem/core-kernel";
import { readJSONSync, removeSync } from "fs-extra";
import { join, resolve } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { SandboxCallback } from "./contracts";

export class Sandbox {
	public readonly app: Application;

	readonly #container: interfaces.Container;

	#path = dirSync().name;

	#configurationOptions: Contracts.NetworkGenerator.Options = {
		blockTime: 8,
		configPath: resolve(`${this.#path}/unitnet`),
		distribute: true,
		explorer: "http://uexplorer.ark.io",
		maxBlockPayload: 2_097_152,
		maxTxPerBlock: 150,
		network: "unitnet",
		premine: "15300000000000000",
		pubKeyHash: 23,
		rewardAmount: "200_000_000",
		rewardHeight: 75_600,
		symbol: "UѦ",
		token: "UARK",
		validators: 51,
		wif: 186,
	};

	public constructor() {
		setGracefulCleanup();

		this.#container = new Container();

		this.app = new Application(this.#container);
	}

	public getConfigurationPath() {
		return join(this.#path, this.#configurationOptions.network);
	}

	public withConfigurationOptions(options: Contracts.NetworkGenerator.Options) {
		this.#configurationOptions = { ...this.#configurationOptions, ...options };

		return this;
	}

	public async boot(callback?: SandboxCallback): Promise<void> {
		const configApp = await makeApplication(this.getConfigurationPath());
		await configApp.resolve(ConfigurationGenerator).generate(this.#configurationOptions);

		if (this.app.isBound(Identifiers.Cryptography.Configuration)) {
			this.app
				.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
				.setConfig(readJSONSync(join(this.#configurationOptions.configPath, "crypto.json")));
		}

		// Configure Application
		process.env.CORE_PATH_CONFIG = this.getConfigurationPath();

		if (callback) {
			callback({
				app: this.app,
				container: this.#container,
			});

			this.snapshot();
		}
	}

	public async dispose(callback?: SandboxCallback): Promise<void> {
		try {
			await this.app.terminate();
		} catch {
			// We encountered a unexpected error.
		}

		removeSync(this.#path);

		if (callback) {
			callback({ app: this.app, container: this.#container });
		}
	}

	public snapshot(): void {
		this.#container.snapshot();
	}

	public restore(): void {
		try {
			this.#container.restore();
		} catch {
			// No snapshot available to restore.
		}
	}

	public async registerServiceProvider({
		name,
		path,
		klass,
	}: {
		name: string;
		path: string;
		klass: Types.Class<any>;
	}): Promise<this> {
		const serviceProvider: Providers.ServiceProvider = this.app.resolve<any>(klass);
		serviceProvider.setManifest(this.app.resolve(Providers.PluginManifest).discover(path));
		serviceProvider.setConfig(this.app.resolve(Providers.PluginConfiguration).discover(name, path));

		this.app
			.get<Providers.ServiceProviderRepository>(Identifiers.ServiceProviderRepository)
			.set(name, serviceProvider);

		await serviceProvider.register();

		return this;
	}
}
