import { Application, Container, Providers, Services, Types } from "@arkecosystem/core-kernel";
import { Managers } from "@arkecosystem/crypto";
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
				network: "unitnet",
				premine: "15300000000000000",
				delegates: 51,
				blocktime: 8,
				maxTxPerBlock: 150,
				maxBlockPayload: 2097152,
				rewardHeight: 75600,
				rewardAmount: 200000000,
				pubKeyHash: 23,
				wif: 186,
				token: "UARK",
				symbol: "UѦ",
				explorer: "http://uexplorer.ark.io",
				distribute: true,
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
		const exceptions = require(this.paths.crypto.exceptions);
		const genesisBlock = require(this.paths.crypto.genesisBlock);
		const milestones = require(this.paths.crypto.milestones);
		const network = require(this.paths.crypto.network);

		Managers.configManager.setConfig({
			exceptions,
			genesisBlock,
			milestones,
			network,
		});

		this.app.get<Services.Config.ConfigRepository>(Container.Identifiers.ConfigRepository).merge({
			crypto: {
				exceptions,
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
		} catch (error) {
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
			.get<Providers.ServiceProviderRepository>(Container.Identifiers.ServiceProviderRepository)
			.set(name, serviceProvider);

		return this;
	}
}
