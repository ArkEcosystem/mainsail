import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { ensureDirSync, pathExistsSync } from "fs-extra/esm";
import { join } from "path";

import { ConfigurationWriter } from "./configuration-writer.js";
import { EnvironmentData } from "./contracts.js";
import {
	AppGenerator,
	EnvironmentGenerator,
	GenesisBlockGenerator,
	MilestonesGenerator,
	MnemonicGenerator,
	NetworkGenerator,
	PeersGenerator,
	WalletGenerator,
} from "./generators/index.js";
import { Identifiers as InternalIdentifiers } from "./identifiers.js";

type Task = {
	task: () => Promise<void>;
	title: string;
};

@injectable()
export class ConfigurationGenerator {
	@inject(InternalIdentifiers.Application)
	private app!: Application;

	@inject(InternalIdentifiers.ConfigurationPath)
	private configurationPath!: string;

	@inject(InternalIdentifiers.ConfigurationWriter)
	private configurationWriter!: ConfigurationWriter;

	@inject(InternalIdentifiers.Generator.App)
	private appGenerator!: AppGenerator;

	@inject(InternalIdentifiers.Generator.Environment)
	private environmentGenerator!: EnvironmentGenerator;

	@inject(InternalIdentifiers.Generator.GenesisBlock)
	private genesisBlockGenerator!: GenesisBlockGenerator;

	@inject(InternalIdentifiers.Generator.Milestones)
	private milestonesGenerator!: MilestonesGenerator;

	@inject(InternalIdentifiers.Generator.Mnemonic)
	private mnemonicGenerator!: MnemonicGenerator;

	@inject(InternalIdentifiers.Generator.Network)
	private networkGenerator!: NetworkGenerator;

	@inject(InternalIdentifiers.Generator.Peers)
	private peersGenerator!: PeersGenerator;

	@inject(InternalIdentifiers.Generator.Wallet)
	private walletGenerator!: WalletGenerator;

	public async generate(
		options: Contracts.NetworkGenerator.Options,
		writeOptions?: Contracts.NetworkGenerator.WriteOptions,
	): Promise<void> {
		const internalOptions: Contracts.NetworkGenerator.InternalOptions = {
			blockTime: 8000,
			coreDBHost: "localhost",
			coreDBPort: 5432,
			coreP2PPort: 4000,
			coreWebhooksPort: 4004,
			distribute: false,
			epoch: new Date(),
			explorer: "",
			force: false,
			initialBlockNumber: 0,
			maxBlockGasLimit: 10_000_000,
			maxBlockPayload: 2_097_152,
			maxTxPerBlock: 150,
			overwriteConfig: false,
			peers: ["127.0.0.1"],
			premine: "125000000000000000000000000",
			pubKeyHash: 30,
			rewardAmount: "2000000000000000000",
			rewardHeight: 75_600,
			validators: 53,
			vendorFieldLength: 255,
			wif: 186,
			...options,
		};

		writeOptions = {
			writeApp: true,
			writeCrypto: true,
			writeEnvironment: true,
			writeGenesisBlock: true,
			writePeers: true,
			writeSnapshot: !!options.snapshot,
			writeValidators: true,
			...writeOptions,
		};

		const genesisWalletMnemonic = this.mnemonicGenerator.generate();
		let validatorsMnemonics = this.mnemonicGenerator.generateMany(internalOptions.validators);

		const tasks: Task[] = [
			{
				task: async () => {
					if (!internalOptions.overwriteConfig && pathExistsSync(this.configurationPath)) {
						throw new Error(`${this.configurationPath} already exists.`);
					}

					ensureDirSync(this.configurationPath);
				},
				title: `Preparing directories.`,
			},
		];

		if (writeOptions.writeGenesisBlock) {
			tasks.push({
				task: async () => {
					this.configurationWriter.writeGenesisWallet(
						await this.walletGenerator.generate(genesisWalletMnemonic),
					);
				},
				title: "Writing genesis-wallet.json in core config path.",
			});
		}

		if (writeOptions.writeCrypto) {
			tasks.push({
				task: async () => {
					if (options.snapshot) {
						const importer = this.app.get<Contracts.Snapshot.LegacyImporter>(
							Identifiers.Snapshot.Legacy.Importer,
						);
						await importer.prepare(options.snapshot.path);
						internalOptions.initialBlockNumber = Number(importer.genesisBlockNumber);
					}

					const milestones = this.milestonesGenerator
						.setInitial(internalOptions)
						.setReward(
							internalOptions.initialBlockNumber + internalOptions.rewardHeight,
							internalOptions.rewardAmount,
						)
						.generate();

					this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
						genesisBlock: {
							// @ts-ignore
							block: {
								number: internalOptions.initialBlockNumber,
							},
						},
						milestones,
						// @ts-ignore
						network: {},
					});

					if (options.snapshot) {
						const importer = this.app.get<Contracts.Snapshot.LegacyImporter>(
							Identifiers.Snapshot.Legacy.Importer,
						);
						milestones[0].snapshot = {
							previousGenesisBlockHash: importer.previousGenesisBlockHash,
							snapshotHash: importer.snapshotHash,
						};

						if (importer.validators && options.mockFakeValidatorBlsKeys) {
							const importedValidatorMnemonics: string[] = [];
							// create fake mnemonics for testing
							const consensusKeyPairFactory = this.app.getTagged<Contracts.Crypto.KeyPairFactory>(
								Identifiers.Cryptography.Identity.KeyPair.Factory,
								"type",
								"consensus",
							);

							for (const validator of importer.validators) {
								const validatorMnemonic = this.mnemonicGenerator.generateDeterministic(
									validator.username,
								);
								importedValidatorMnemonics.push(validatorMnemonic);

								const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(validatorMnemonic);
								validator.blsPublicKey = consensusKeyPair.publicKey;
							}

							// imported validators are already sorted by descending balance
							validatorsMnemonics = importedValidatorMnemonics.slice(0, internalOptions.validators);
						}
					}

					const genesisBlock = await this.genesisBlockGenerator.generate(
						genesisWalletMnemonic,
						validatorsMnemonics,
						internalOptions,
					);

					const network = this.networkGenerator.generate(internalOptions);

					this.configurationWriter.writeCrypto(genesisBlock, milestones, network);
				},
				title: "Writing crypto.json in core config path.",
			});
		}

		if (writeOptions.writeSnapshot) {
			tasks.push({
				task: async () => {
					if (!options.snapshot || !options.snapshot.snapshotHash) {
						throw new Error("missing snapshot config");
					}

					ensureDirSync(join(this.configurationPath, "snapshot"));
					this.configurationWriter.writeSnapshot(options.snapshot.path, options.snapshot.snapshotHash);
				},
				title: `Writing snapshot.json in core config path.`,
			});
		}

		if (writeOptions.writePeers) {
			tasks.push({
				task: async () => {
					this.configurationWriter.writePeers(
						this.peersGenerator.generate(internalOptions.coreP2PPort, internalOptions.peers),
					);
				},
				title: "Writing peers.json in core config path.",
			});
		}

		if (writeOptions.writeValidators) {
			tasks.push(
				{
					task: async () => {
						this.configurationWriter.writeValidators(validatorsMnemonics);
					},
					title: "Writing validators.json in core config path.",
				},
				{
					task: async () => {
						this.configurationWriter.writeEnvironment(
							this.environmentGenerator
								.addInitialRecords()
								.addRecords(this.#preparteEnvironmentOptions(internalOptions))
								.generate(),
						);
					},
					title: "Writing .env in core config path.",
				},
			);
		}

		if (writeOptions.writeApp) {
			tasks.push({
				task: async () => {
					this.configurationWriter.writeApp(this.appGenerator.generate(internalOptions));
				},
				title: "Writing app.json in core config path.",
			});
		}

		let logger: Contracts.Kernel.Logger | undefined;
		if (this.app.isBound(Identifiers.Services.Log.Service)) {
			logger = this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service);
		}

		for (const task of tasks) {
			logger?.info(task.title);
			await task.task();
		}

		logger?.info(`Configuration generated on location: ${this.configurationPath}`);
	}

	#preparteEnvironmentOptions(options: Contracts.NetworkGenerator.InternalOptions): EnvironmentData {
		const data: EnvironmentData = {
			MAINSAIL_API_EVM_HOST: "127.0.0.1",

			MAINSAIL_API_EVM_PORT: 4008,

			MAINSAIL_API_TRANSACTION_POOL_HOST: "127.0.0.1",

			MAINSAIL_API_TRANSACTION_POOL_PORT: 4007,

			MAINSAIL_CRYPTO_WORKER_COUNT: 2,
			// MAINSAIL_DB_HOST: options.coreDBHost,
			// MAINSAIL_DB_PORT: options.coreDBPort,
			MAINSAIL_P2P_PORT: options.coreP2PPort,
			MAINSAIL_WEBHOOKS_PORT: options.coreWebhooksPort,
		};

		if (options.mockFakeValidatorBlsKeys) {
			data.MAINSAIL_SNAPSHOT_MOCK_FAKE_VALIDATOR_BLS_KEYS = "1";
		}

		// if (options.coreDBDatabase) {
		// 	data.MAINSAIL_DB_DATABASE = options.coreDBDatabase;
		// }

		// if (options.coreDBUsername) {
		// 	data.MAINSAIL_DB_USERNAME = options.coreDBUsername;
		// }

		// if (options.coreDBPassword) {
		// 	data.MAINSAIL_DB_PASSWORD = options.coreDBDatabase;
		// }

		return data;
	}
}
