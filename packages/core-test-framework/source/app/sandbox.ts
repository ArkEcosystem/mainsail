import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Container, Providers, Services, Types } from "@arkecosystem/core-kernel";
import { removeSync } from "fs-extra";
import { setGracefulCleanup } from "tmp";

import {
	CoreConfigPaths,
	CoreOptions,
	CryptoConfigPaths,
	CryptoOptions,
	SandboxCallback,
	SandboxOptions,
} from "./contracts";
import { generateCoreConfig, generateCryptoConfig } from "./generators";

export class Sandbox {
	public readonly app: Application;

	private readonly container: Container.interfaces.Container;

	private paths!: {
		core: CoreConfigPaths;
		crypto: CryptoConfigPaths;
	};

	private readonly options: SandboxOptions = {
		core: {},
		crypto: {
			flags: {
				blocktime: 8,
				delegates: 51,
				distribute: true,
				explorer: "http://uexplorer.ark.io",
				maxBlockPayload: 2_097_152,
				maxTxPerBlock: 150,
				network: "unitnet",
				premine: "15300000000000000",
				pubKeyHash: 23,
				rewardAmount: 200_000_000,
				rewardHeight: 75_600,
				symbol: "UѦ",
				token: "UARK",
				wif: 186,
			},
		},
	};

	public constructor() {
		setGracefulCleanup();

		this.container = new Container.Container();

		this.app = new Application(this.container);
	}

	public withCoreOptions(options: CoreOptions): this {
		this.options.core = { ...this.options.core, ...options };

		return this;
	}

	public withCryptoOptions(options: CryptoOptions): this {
		this.options.crypto = { ...this.options.crypto, ...options };

		return this;
	}

	public async boot(callback?: SandboxCallback): Promise<void> {
		// Generate Configurations
		this.paths = {
			core: generateCoreConfig(this.options),
			crypto: generateCryptoConfig(this.options),
		};

		// Configure Crypto
		const genesisBlock = require(this.paths.crypto.genesisBlock);
		const milestones = require(this.paths.crypto.milestones);
		const network = require(this.paths.crypto.network);

		// this.configuration.setConfig({
		// 	genesisBlock,
		// 	milestones,
		// 	network,
		// });

		this.app.get<Services.Config.ConfigRepository>(Identifiers.ConfigRepository).merge({
			crypto: {
				genesisBlock,
				milestones,
				network,
			},
		});

		// Configure Application
		process.env.CORE_PATH_CONFIG = this.paths.core.root;

		if (callback) {
			await callback({
				app: this.app,
				container: this.container,
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

		removeSync(this.paths.crypto.root);
		removeSync(this.paths.core.root);

		if (callback) {
			await callback({ app: this.app, container: this.container });
		}
	}

	public snapshot(): void {
		this.container.snapshot();
	}

	public restore(): void {
		try {
			this.container.restore();
		} catch {
			// No snapshot available to restore.
		}
	}

	public registerServiceProvider({
		name,
		path,
		klass,
	}: {
		name: string;
		path: string;
		klass: Types.Class<any>;
	}): this {
		const serviceProvider: Providers.ServiceProvider = this.app.resolve<any>(klass);
		serviceProvider.setManifest(this.app.resolve(Providers.PluginManifest).discover(path));
		serviceProvider.setConfig(this.app.resolve(Providers.PluginConfiguration).discover(name, path));

		this.app
			.get<Providers.ServiceProviderRepository>(Identifiers.ServiceProviderRepository)
			.set(name, serviceProvider);

		return this;
	}
}
