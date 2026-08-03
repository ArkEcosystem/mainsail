import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { FunctionSigs } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { ensureError } from "@mainsail/utils";
import { validateMnemonic } from "bip39";
import dayjs from "dayjs";
import { ensureDirSync, pathExistsSync } from "fs-extra/esm";
import { join } from "path";

import { ConfigurationWriter } from "./configuration-writer.js";
import { EnvironmentData, Task } from "./contracts.js";
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

const assertMnemonic = (mnemonic: unknown, label: string): void => {
	if (typeof mnemonic !== "string" || !validateMnemonic(mnemonic)) {
		throw new Error(`${label} is not a valid BIP39 mnemonic.`);
	}
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

	@inject(Identifiers.Services.Log.Service)
	private logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	private importer!: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private transactionDeserializer!: Contracts.Crypto.TransactionDeserializer;

	public async generate(options: Contracts.NetworkGenerator.Options): Promise<void> {
		const internalOptions: Contracts.NetworkGenerator.InternalOptions = {
			blockTime: 8000,
			coreDBHost: "localhost",
			coreDBPort: 5432,
			coreP2PPort: 4000,
			epoch: new Date(),
			explorer: "",
			initialBlockNumber: 0,
			maxBlockGasLimit: 10_000_000,
			maxBlockPayload: 2_097_152,
			overwriteConfig: false,
			peers: ["127.0.0.1"],
			premine: "125000000000000000000000000",
			pubKeyHash: 30,
			rewardAmount: "2000000000000000000",
			rewardHeight: 75_600,
			validatorRegistrationFee: "250000000000000000000",
			validators: 53,
			wif: 186,
			...options,
		};

		this.#assertCustomSecrets(internalOptions);

		if (internalOptions.validatorTransactions) {
			internalOptions.validators = await this.#deriveValidatorCount(
				internalOptions.validatorTransactions,
				options.validators,
			);
		}

		const genesisWalletMnemonic = internalOptions.genesisMnemonic ?? this.mnemonicGenerator.generate();
		// In presigned mode no validator secrets exist; validators.json is written empty.
		const validatorsMnemonics = internalOptions.validatorTransactions
			? []
			: (internalOptions.validatorMnemonics ?? this.mnemonicGenerator.generateMany(internalOptions.validators));

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
			{
				task: async () => {
					this.configurationWriter.writeGenesisWallet(
						await this.walletGenerator.generate(genesisWalletMnemonic),
					);
				},
				title: "Writing genesis-wallet.json in core config path.",
			},
			{
				task: async () => {
					if (options.snapshot) {
						await this.importer.prepare(options.snapshot.path);
						internalOptions.initialBlockNumber = Number(this.importer.genesisBlockNumber);
						internalOptions.premine = "0";
					}

					const milestones = this.milestonesGenerator
						.setInitial(internalOptions)
						.setReward(
							internalOptions.initialBlockNumber + internalOptions.rewardHeight,
							internalOptions.rewardAmount,
						)
						.generate();

					this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(
						{
							genesisBlock: {
								// @ts-ignore
								block: {
									number: internalOptions.initialBlockNumber,
									timestamp: dayjs(internalOptions.epoch).valueOf(),
								},
							},
							milestones,
							// @ts-ignore
							network: {
								chainId: internalOptions.chainId,
								client: {
									explorer: "",
									symbol: internalOptions.symbol,
									token: internalOptions.token,
								},
								pubKeyHash: internalOptions.pubKeyHash,
							},
						},
						false,
					);

					if (options.snapshot) {
						milestones[0].snapshot = {
							previousGenesisBlockHash: this.importer.previousGenesisBlockHash,
							snapshotHash: this.importer.snapshotHash,
						};
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
			},
		];

		// Only write the snapshot when a snapshot source was provided.
		if (options.snapshot) {
			tasks.push({
				task: async () => {
					if (!options.snapshot || !options.snapshot.snapshotHash) {
						throw new Error("missing snapshot config");
					}

					ensureDirSync(join(this.configurationPath, "snapshot"));
					this.configurationWriter.writeSnapshot(options.snapshot.path);
				},
				title: `Writing snapshot.json in core config path.`,
			});
		}

		tasks.push(
			{
				task: async () => {
					this.configurationWriter.writePeers(
						this.peersGenerator.generate(internalOptions.coreP2PPort, internalOptions.peers),
					);
				},
				title: "Writing peers.json in core config path.",
			},
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
							.addRecords(this.#prepareEnvironmentOptions(internalOptions))
							.generate(),
					);
				},
				title: "Writing .env in core config path.",
			},
			{
				task: async () => {
					this.configurationWriter.writeApp(this.appGenerator.generate(internalOptions));
				},
				title: "Writing app.json in core config path.",
			},
		);

		for (const task of tasks) {
			this.logger.info(task.title);
			await task.task();
		}

		this.logger.info(`Configuration generated on location: ${this.configurationPath}`);
	}

	#assertCustomSecrets(options: Contracts.NetworkGenerator.InternalOptions): void {
		if (options.genesisMnemonic !== undefined) {
			assertMnemonic(options.genesisMnemonic, "genesisMnemonic");
		}

		this.#assertValidatorTransactions(options);

		if (options.validatorMnemonics !== undefined) {
			if (!Array.isArray(options.validatorMnemonics) || options.validatorMnemonics.length === 0) {
				throw new Error("validatorMnemonics must be a non-empty array.");
			}

			if (options.validatorMnemonics.length !== options.validators) {
				throw new Error(
					`validatorMnemonics length (${options.validatorMnemonics.length}) does not match the validators count (${options.validators}).`,
				);
			}

			for (const [index, mnemonic] of options.validatorMnemonics.entries()) {
				assertMnemonic(mnemonic, `validatorMnemonics[${index}]`);
			}

			const unique = new Set(options.validatorMnemonics);
			if (unique.size !== options.validatorMnemonics.length) {
				throw new Error("validatorMnemonics contains duplicate entries.");
			}

			if (options.genesisMnemonic !== undefined && unique.has(options.genesisMnemonic)) {
				throw new Error("genesisMnemonic must not also be a validator mnemonic.");
			}
		}
	}

	#assertValidatorTransactions(options: Contracts.NetworkGenerator.InternalOptions): void {
		if (options.validatorTransactions === undefined) {
			return;
		}

		if (options.validatorMnemonics !== undefined) {
			throw new Error("validatorMnemonics and validatorTransactions are mutually exclusive.");
		}

		if (!Array.isArray(options.validatorTransactions) || options.validatorTransactions.length === 0) {
			throw new Error("validatorTransactions must be a non-empty array.");
		}

		for (const [index, transaction] of options.validatorTransactions.entries()) {
			if (typeof transaction !== "string" || transaction.length === 0) {
				throw new Error(`validatorTransactions[${index}] must be a hex-encoded serialized transaction.`);
			}
		}

		if (new Set(options.validatorTransactions).size !== options.validatorTransactions.length) {
			throw new Error("validatorTransactions contains duplicate entries.");
		}
	}

	async #deriveValidatorCount(validatorTransactions: string[], explicitValidators?: number): Promise<number> {
		const consensusContractAddress = this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus);

		for (const [index, transaction] of validatorTransactions.entries()) {
			let data: Contracts.Crypto.TransactionSerializable;
			try {
				({ data } = await this.transactionDeserializer.deserialize(Buffer.from(transaction, "hex")));
			} catch (error) {
				throw new Error(
					`validatorTransactions[${index}] cannot be deserialized: ${ensureError(error).message}`,
				);
			}

			if (
				data.to !== consensusContractAddress ||
				!data.data.startsWith(FunctionSigs.ConsensusV1.RegisterValidator)
			) {
				throw new Error(
					`validatorTransactions[${index}] is not a registerValidator call to the consensus contract.`,
				);
			}
		}

		const registrations = validatorTransactions.length;

		if (explicitValidators !== undefined && explicitValidators !== registrations) {
			throw new Error(
				`validatorTransactions registration count (${registrations}) does not match the validators count (${explicitValidators}).`,
			);
		}

		return registrations;
	}

	#prepareEnvironmentOptions(options: Contracts.NetworkGenerator.InternalOptions): EnvironmentData {
		const data: EnvironmentData = {
			MAINSAIL_P2P_PORT: options.coreP2PPort,
		};

		if (
			options.coreDBHost &&
			options.coreDBPort &&
			options.coreDBUsername &&
			options.coreDBPassword &&
			options.coreDBDatabase
		) {
			data.MAINSAIL_DB_HOST = options.coreDBHost;
			data.MAINSAIL_DB_PORT = options.coreDBPort;
			data.MAINSAIL_DB_USERNAME = options.coreDBUsername;
			data.MAINSAIL_DB_PASSWORD = options.coreDBPassword;
			data.MAINSAIL_DB_DATABASE = options.coreDBDatabase;
		}

		return data;
	}
}
