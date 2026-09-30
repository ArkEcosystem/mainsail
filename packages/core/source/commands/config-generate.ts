import type { Contracts } from "@mainsail/contracts";

import { Commands } from "@mainsail/cli";
import { ConfigurationGenerator, Identifiers, makeApplication } from "@mainsail/configuration-generator";
import { Identifiers as AppIdentifiers, Identifiers as CliIdentifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts as AppContracts } from "@mainsail/contracts";
import envPaths from "env-paths";
import { existsSync } from "fs";
import { readJSONSync } from "fs-extra/esm";
import Joi from "joi";
import path from "path";
import prompts from "prompts";

type Flag = {
	name: string;
	description: string;
	schema: Joi.Schema;
	promptType?: string;
	default?: string | number | boolean | Date;
};

type Flags = Omit<AppContracts.NetworkGenerator.Options, "peers" | "rewardAmount"> & {
	peers: string;
	rewardAmount: number | string;
	validatorsFile?: string;
};

@injectable()
export class Command extends Commands.Command {
	@inject(CliIdentifiers.Cli.Service.Logger)
	private readonly logger!: Contracts.Cli.Logger;

	public signature = "config:generate";

	public description = "Generate a new configuration.";

	/*eslint-disable */
	#flagSettings: Flag[] = [
		{
			name: "network",
			description: "The name of the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "devnet",
		},
		{
			name: "chainId",
			description: "The chain id of the network.",
			schema: Joi.number(),
			default: 10_000,
		},
		{
			name: "premine",
			description: "The number of pre-mined tokens (in wei).",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "text",
			default: "12500000000000000000000000",
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
			description: "The number of the block reward per forged block (in wei).",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "number",
			default: "2000000000000000000",
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
			name: "epoch",
			description: "Start time of the network.",
			schema: Joi.date(),
			default: new Date(),
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

		// Externally supplied validators
		{
			name: "validatorsFile",
			description:
				'Path to a JSON file supplying the genesis validators: { "genesisMnemonic"?: string, "validatorMnemonics": string[] }. A validators.json-style { "secrets": [...] } is also accepted. Alternatively "validatorRegistrations": string[] supplies hex-encoded presigned transactions (one registerValidator call per validator; anything else is rejected) so no validator secrets are needed at all. When provided, the validator count follows the supplied list.',
			schema: Joi.string(),
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

	@postConstruct()
	public configure(): void {
		for (const flag of this.#flagSettings) {
			if (flag.default !== undefined) {
				// The Joi schemas deliberately carry no defaults: execute() must be able to
				// detect "all prompt flags provided" via undefined to decide between the
				// prompt and the direct path, and merges #flagSettings defaults manually.
				flag.description += ` (${flag.default.toString()})`;
			}

			this.definition.setFlag(flag.name, flag.description, flag.schema);
		}
	}

	public async execute(): Promise<void> {
		const flags: Contracts.Cli.AnyObject = this.getFlags();

		const allFlagsSet = !this.#flagSettings
			.filter((flag) => flag.promptType)
			.some((flag) => flags[flag.name] === undefined);

		const defaults = this.#flagSettings.reduce((accumulator: Record<string, Flag["default"]>, flag: Flag) => {
			accumulator[flag.name] = flag.default;

			return accumulator;
		}, {});

		let options = {
			...defaults,
			...flags,
			packageName: this.app.get<AppContracts.Types.PackageJson>(CliIdentifiers.Cli.Package).name,
		} as Flags;

		const configurationApp = await makeApplication(this.#getConfigurationPath(options), options);
		configurationApp.rebind(AppIdentifiers.Services.Log.Service).toConstantValue(this.logger);

		try {
			if (flags.force || allFlagsSet) {
				return await configurationApp
					.get<ConfigurationGenerator>(Identifiers.ConfigurationGenerator)
					.generate(this.#convertFlags(options, flags.validators !== undefined));
			}

			const response = await prompts([
				...this.#flagSettings
					.filter((flag) => flag.promptType) // Show prompt only for flags with defined promptType
					.map(
						(flag) =>
							({
								initial: flags[flag.name] ? `${flags[flag.name]}` : flag.default || "undefined",
								message: flag.description,
								name: flag.name,
								type: flag.promptType,
							}) as prompts.PromptObject<string>,
					),
				{
					message: "Can you confirm?",
					name: "confirm",
					type: "confirm",
				} as prompts.PromptObject<string>,
			]);

			options = {
				...defaults,
				...flags,
				...response,
				packageName: this.app.get<AppContracts.Types.PackageJson>(CliIdentifiers.Cli.Package).name,
			} as Flags;

			const path = this.#getConfigurationPath(options, configurationApp.get(CliIdentifiers.Cli.Application.Name));
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
				.generate(this.#convertFlags(options, true));
		} finally {
			// The genesis generation boots the Rust EVM, whose native runtime keeps the
			// event loop alive until the instance is disposed — without this, the process
			// (real CLI included) never exits after generating.
			await configurationApp
				.getTagged<{ dispose(): Promise<void> }>(AppIdentifiers.Evm.Instance, "instance", "evm")
				.dispose();
		}
	}

	#convertFlags(options: Flags, validatorsExplicit: boolean): AppContracts.NetworkGenerator.Options {
		const external = this.#readValidatorsFile(options);

		// When the validators come from a file and no explicit --validators was given, the
		// count follows the file. An explicit, conflicting --validators is left intact so the
		// generator rejects the mismatch rather than silently overriding it. For presigned
		// registrations the count is derived by the generator itself (it requires deserializing
		// them), so pass undefined instead of the flag default.
		let validators: number | undefined = options.validators;
		if (!validatorsExplicit) {
			if (external.validatorMnemonics) {
				validators = external.validatorMnemonics.length;
			} else if (external.validatorRegistrations) {
				validators = undefined;
			}
		}

		return {
			...options,
			...external,
			// Trim each entry and drop empty ones: --peers="" means no peers, and
			// "a, b, c" must not keep leading spaces past the first entry.
			peers: options.peers
				.split(",")
				.map((peer) => peer.trim())
				.filter((peer) => peer.length > 0),
			rewardAmount: options.rewardAmount.toString(),
			validators,
		};
	}

	#readValidatorsFile(options: Flags): {
		genesisMnemonic?: string;
		validatorMnemonics?: string[];
		validatorRegistrations?: string[];
	} {
		if (!options.validatorsFile) {
			return {};
		}

		const resolved = path.resolve(options.validatorsFile);
		if (!existsSync(resolved)) {
			throw new Error(`Validators file not found: ${resolved}`);
		}

		const contents = readJSONSync(resolved);
		const validatorMnemonics = contents.validatorMnemonics ?? contents.secrets;
		const validatorRegistrations = contents.validatorRegistrations;
		const genesisMnemonic = contents.genesisMnemonic ?? contents.genesis;

		// Shape checks only; per-mnemonic BIP39 validation and the deserialization of
		// presigned registrations happen in the generator.
		if (validatorMnemonics !== undefined && !Array.isArray(validatorMnemonics)) {
			throw new Error(`Validators file ${resolved}: "validatorMnemonics" must be an array of mnemonics.`);
		}

		if (validatorRegistrations !== undefined && !Array.isArray(validatorRegistrations)) {
			throw new Error(
				`Validators file ${resolved}: "validatorRegistrations" must be an array of hex-encoded transactions.`,
			);
		}

		if (genesisMnemonic !== undefined && typeof genesisMnemonic !== "string") {
			throw new Error(`Validators file ${resolved}: "genesisMnemonic" must be a string.`);
		}

		return { genesisMnemonic, validatorMnemonics, validatorRegistrations };
	}

	#getConfigurationPath(options: Flags, applicationName?: string): string {
		const paths = envPaths(options.token, { suffix: "core" });
		const configPath = options.configPath ? options.configPath : paths.config;

		return applicationName
			? path.join(configPath, options.network, applicationName)
			: path.join(configPath, options.network);
	}
}
