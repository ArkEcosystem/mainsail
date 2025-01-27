import { ConfigurationGenerator, makeApplication } from "@mainsail/configuration-generator";
import { Container, interfaces } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Providers } from "@mainsail/kernel";
import { readJSONSync, removeSync } from "fs-extra/esm";
import { join, resolve } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { SandboxCallback } from "./contracts.js";

export class Sandbox {
	public readonly app: Application;
	readonly #container: interfaces.Container;

	#configApp?: Application;
	#path = dirSync().name;

	#configurationOptions: Contracts.NetworkGenerator.Options = {
		blockTime: 8000,
		chainId: 99_999,
		configPath: resolve(`${this.#path}/unitnet`),
		distribute: true,
		explorer: "http://uexplorer.ark.io",
		maxBlockPayload: 2_097_152,
		maxTxPerBlock: 150,
		network: "unitnet",
		premine: "53000000000000000",
		pubKeyHash: 23,
		rewardAmount: "200_000_000",
		rewardHeight: 75_600,
		symbol: "UѦ",
		token: "UARK",
		validators: 53,
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

		this.#configApp = configApp;

		if (this.app.isBound(Identifiers.Cryptography.Configuration)) {
			this.app
				.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
				.setConfig(readJSONSync(join(this.#configurationOptions.configPath ?? "", "crypto.json")));
		}

		// Configure Application
		process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG] = this.getConfigurationPath();

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
			// Terminate calls process.exit(), which we cannot do during unit tests.
			// However, due to exceptions it never gets that far currently so it happens to "work".
			// await this.app.terminate();
			//
			// Furthermore, most unit tests fail to shutdown the sandbox correctly as the registered services are not tracked in
			// the service registry meaning `#disposeServiceProviders` does not actually dispose them.
			//
			// Therefore, for now we simply manually dispose the services that are known to require explicit closing such as the EVM.
			// In the future, we should automate this by tracking.
			for (const tag of ["evm", "validator", "transaction-pool"]) {
				if (this.#configApp?.isBoundTagged(Identifiers.Evm.Instance, "instance", tag)) {
					{
						await this.#configApp
							?.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", tag)
							.dispose();
					}
				}
			}
		} catch (error) {
			console.log("ex", error);
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
		klass: Contracts.Types.Class<any>;
	}): Promise<this> {
		const serviceProvider: Providers.ServiceProvider = this.app.resolve<any>(klass);
		// serviceProvider.setManifest(this.app.resolve(Providers.PluginManifest).discover(path)); // TODO: Check resolve path
		serviceProvider.setConfig(await this.app.resolve(Providers.PluginConfiguration).discover(name, path));

		this.app
			.get<Providers.ServiceProviderRepository>(Identifiers.ServiceProvider.Repository)
			.set(name, serviceProvider);

		await serviceProvider.register();

		return this;
	}
}
