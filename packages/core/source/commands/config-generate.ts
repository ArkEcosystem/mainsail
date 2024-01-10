import { Commands, Contracts, Identifiers as CliIdentifiers, Services } from "@mainsail/cli";
import { ConfigurationGenerator, Identifiers, makeApplication } from "@mainsail/configuration-generator";
import { inject, injectable } from "@mainsail/container";
import { Contracts as AppContracts, Identifiers as AppIdentifiers } from "@mainsail/contracts";
import envPaths from "env-paths";
import Joi from "joi";
import path from "path";
import prompts from "prompts";

type Flag = {
	name: string;
	description: string;
	schema: Joi.Schema;
	promptType?: string;
	default?: any;
};

type Flags = Omit<AppContracts.NetworkGenerator.Options, "peers" | "rewardAmount"> & {
	peers: string;
	rewardAmount: number | string;

	address: "base58" | "bech32m";
	base58Prefix: number;
	bech32mPrefix: string;
};

@injectable()
export class Command extends Commands.Command {
	@inject(CliIdentifiers.Logger)
	private readonly logger!: Services.Logger;

	public signature = "config:generate";

	public description = "Generate a new configuration.";

	public requiresNetwork = false;

	/*eslint-disable */
	#flagSettings: Flag[] = [
		{
			name: "network",
			description: "The name of the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "testnet",
		},
		{
			name: "premine",
			description: "The number of pre-mined tokens.",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "text",
			default: "12500000000000000",
		},
		{
			name: "validators",
			description: "The number of validators to generate.",
			schema: Joi.number(),
			promptType: "number",
			default: 53,
		},
		{
			name: "blockTime",
			description: "The network blockTime.",
			schema: Joi.number(),
			promptType: "number",
			default: 8000,
		},
		{
			name: "maxTxPerBlock",
			description: "The maximum number of transactions per block.",
			schema: Joi.number(),
			promptType: "number",
			default: 150,
		},
		{
			name: "maxBlockPayload",
			description: "The maximum payload length by block.",
			schema: Joi.number(),
			promptType: "number",
			default: 2097152,
		},
		{
			name: "rewardHeight",
			description: "The height at which validator block reward starts.",
			schema: Joi.number(),
			promptType: "number",
			default: 75600,
		},
		{
			name: "rewardAmount",
			description: "The number of the block reward per forged block.",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "number",
			default: "200000000",
		},
		{
			name: "pubKeyHash",
			description: "The public key hash.",
			schema: Joi.number(),
			promptType: "number",
			default: 30,
		},
		{
			name: "wif",
			description: "The WIF (Wallet Import Format) that should be used.",
			schema: Joi.number(),
			promptType: "number",
			default: 186,
		},
		{
			name: "token",
			description: "The name that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "ARK",
		},
		{
			name: "symbol",
			description: "The character that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "TѦ",
		},
		{
			name: "explorer",
			description: "The URL that hosts the network explorer.",
			schema: Joi.string(),
			promptType: "text",
			default: "https://explorer.ark.io",
		},
		{
			name: "distribute",
			description: "Distribute the premine evenly between all validators?",
			schema: Joi.bool(),
			promptType: "confirm",
			default: false,
		},
		{
			name: "epoch",
			description: "Start time of the network.",
			schema: Joi.date(),
			default: new Date(),
		},
		{
			name: "vendorFieldLength",
			description: "The maximum length of transaction's vendor field",
			schema: Joi.number().min(0).max(255),
			default: 255,
		},
		{
			name: "address",
			description: "The desired address format of the network.",
			schema: Joi.valid("bech32m", "base58"),
			default: "bech32m",
		},
		{
			name: "base58Prefix",
			description: "The desired address prefix when using base58.",
			schema: Joi.number().min(1).max(255),
			default: 30,
		},
		{
			name: "bech32mPrefix",
			description: "The desired address prefix when using bech32m.",
			schema: Joi.string().min(3).max(3),
			default: "ark",
		},
		// Env
		{ name: "coreP2PPort", description: "Core P2P port.", schema: Joi.number(), default: 4000 },
		{ name: "coreWebhooksPort", description: "Core Webhooks port.", schema: Joi.number(), default: 4004 },
		{ name: "coreMonitorPort", description: "Core Webhooks port.", schema: Joi.number(), default: 4005 },

		// Peers
		{
			name: "peers",
			description: "Peers IP addresses (and ports), separated with comma.",
			schema: Joi.string().allow(""),
			default: "127.0.0.1",
		},

		// General
		{ name: "configPath", description: "Configuration path.", schema: Joi.string() },
		{
			name: "overwriteConfig",
			description: "Overwrite existing configuration.",
			schema: Joi.boolean(),
			default: false,
		},
		{ name: "force", description: "Skip prompts and use given flags.", schema: Joi.boolean(), default: false },
	];
	/*eslint-enable */

	public configure(): void {
		for (const flag of this.#flagSettings) {
			const flagSchema: Joi.Schema = flag.schema;

			if (flag.default !== undefined) {
				flagSchema.default(flag.default);

				flag.description += ` (${flag.default.toString()})`;
			}

			this.definition.setFlag(flag.name, flag.description, flag.schema);
		}
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = this.getFlags();

		const allFlagsSet = !this.#flagSettings
			.filter((flag) => flag.promptType)
			.some((flag) => flags[flag.name] === undefined);

		const defaults = this.#flagSettings.reduce<any>((accumulator: any, flag: Flag) => {
			accumulator[flag.name] = flag.default;

			return accumulator;
		}, {});

		let options: Flags = {
			...defaults,
			...flags,
			packageName: this.app.get<AppContracts.Types.PackageJson>(CliIdentifiers.Package).name,
		};

		const configurationApp = await makeApplication(this.#getConfigurationPath(options), options);
		configurationApp.bind(AppIdentifiers.Kernel.Log.Service).toConstantValue(this.logger);

		if (flags.force || allFlagsSet) {
			return configurationApp
				.get<ConfigurationGenerator>(Identifiers.ConfigurationGenerator)
				.generate(this.#convertFlags(options));
		}

		const response = await prompts(
			this.#flagSettings
				.filter((flag) => flag.promptType) // Show prompt only for flags with defined promptType
				.map(
					(flag) =>
						({
							initial: flags[flag.name] ? `${flags[flag.name]}` : flag.default || "undefined",
							message: flag.description,
							name: flag.name,
							type: flag.promptType,
						}) as prompts.PromptObject<string>,
				)
				.concat({
					message: "Can you confirm?",
					name: "confirm",
					type: "confirm",
				} as prompts.PromptObject<string>),
		);

		options = {
			...defaults,
			...flags,
			...response,
			packageName: this.app.get<AppContracts.Types.PackageJson>(CliIdentifiers.Package).name,
		};

		const path = this.#getConfigurationPath(options, configurationApp.get(CliIdentifiers.ApplicationName));
		configurationApp.rebind(Identifiers.ConfigurationPath).toConstantValue(path);

		if (!response.confirm) {
			throw new Error("You'll need to confirm the input to continue.");
		}

		for (const flag of this.#flagSettings.filter((flag) => flag.promptType)) {
			if (flag.promptType === "text" && options[flag.name] !== "undefined") {
				continue;
			}

			if (flag.promptType === "number" && !Number.isNaN(options[flag.name])) {
				continue;
			}

			if (["confirm", "date"].includes(flag.promptType ?? "")) {
				continue;
			}

			throw new Error(`Flag ${flag.name} is required.`);
		}

		await configurationApp
			.get<ConfigurationGenerator>(Identifiers.ConfigurationGenerator)
			.generate(this.#convertFlags(options));
	}

	#convertFlags(options: Flags): AppContracts.NetworkGenerator.Options {
		return {
			...options,
			address:
				options.address === "bech32m" ? { bech32m: options.bech32mPrefix } : { base58: options.base58Prefix },
			peers: options.peers.replace(" ", "").split(","),
			rewardAmount: options.rewardAmount.toString(),
		};
	}

	#getConfigurationPath(options: Flags, applicationName?: string): string {
		const paths = envPaths(options.token, { suffix: "core" });
		const configPath = options.configPath ? options.configPath : paths.config;

		return applicationName
			? path.join(configPath, options.network, applicationName)
			: path.join(configPath, options.network);
	}
}
