import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { dotenv, get, set } from "@mainsail/utils";
import { existsSync, readFileSync } from "fs";
import importFresh from "import-fresh";
import Joi from "joi";
import { extname } from "path";

import { KeyValuePair } from "../../../types";
import { assert } from "../../../utils";
import { ConfigRepository } from "../repository";

@injectable()
export class LocalConfigLoader implements Contracts.Kernel.ConfigLoader {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.Services.Validation.Service)
	private readonly validationService!: Contracts.Kernel.Validator;

	@inject(Identifiers.Services.Config.Flags)
	private readonly configFlags!: KeyValuePair;

	public async loadEnvironmentVariables(): Promise<void> {
		try {
			const config: Record<string, Contracts.Types.Primitive> = dotenv.parseFile(this.app.environmentFile());

			for (const [key, value] of Object.entries(config)) {
				if (process.env[key] === undefined) {
					set(process.env, key, value);
				}
			}
		} catch (error) {
			throw new Exceptions.EnvironmentConfigurationCannotBeLoaded(error.message);
		}
	}

	public async loadConfiguration(): Promise<void> {
		try {
			this.#loadApplication();

			this.#loadPeers();

			this.#loadValidators();

			this.#loadCryptography();
		} catch (error) {
			throw new Exceptions.ApplicationConfigurationCannotBeLoaded(error.message);
		}
	}

	#loadApplication(): void {
		this.validationService.validate(
			this.#loadFromLocation(["app.json", "app.js"]),
			Joi.object({
				flags: Joi.array().items(Joi.string()).optional(),
				plugins: Joi.array()
					.items(Joi.object().keys({ options: Joi.object().optional(), package: Joi.string() }))
					.required(),
				services: Joi.object().optional(),
			}).unknown(true),
		);

		if (this.validationService.fails()) {
			throw new Error(JSON.stringify(this.validationService.errors()));
		}

		this.configRepository.set("app.flags", {
			...this.app.get<Contracts.Types.JsonObject>(Identifiers.Services.Config.Flags),
			...get(this.validationService.valid(), "flags", {}),
		});

		if (this.app.config("worker", undefined, false)) {
			this.configRepository.set("app.plugins", get(this.validationService.valid(), "workerPlugins", []));
		} else {
			this.configRepository.set("app.plugins", get(this.validationService.valid(), "plugins", []));
		}
	}

	#loadPeers(): void {
		if (this.#skipFileIfNotExists("peers.json")) {
			return;
		}

		this.validationService.validate(
			this.#loadFromLocation(["peers.json"]),
			Joi.object({
				list: Joi.array()
					.items(
						Joi.object().keys({
							ip: Joi.string()
								.ip({ version: ["ipv4", "ipV6"] })
								.required(),
							port: Joi.number().port().required(),
						}),
					)
					.required(),
				sources: Joi.array().items(Joi.string().uri()).optional(),
			}),
		);

		if (this.validationService.fails()) {
			throw new Error(JSON.stringify(this.validationService.errors()));
		}

		this.configRepository.set("peers", this.validationService.valid());
	}

	#loadValidators(): void {
		if (this.#skipFileIfNotExists("validators.json")) {
			return;
		}

		this.validationService.validate(
			this.#loadFromLocation(["validators.json"]),
			Joi.object({
				secrets: Joi.array().items(Joi.string()).optional(),
			}),
		);

		if (this.validationService.fails()) {
			throw new Error(JSON.stringify(this.validationService.errors()));
		}

		this.configRepository.set("validators", this.validationService.valid());
	}

	#loadCryptography(): void {
		if (this.#skipFileIfNotExists("crypto.json", true)) {
			return;
		}

		this.configRepository.set("crypto", this.#loadFromLocation(["crypto.json"]));
	}

	#loadFromLocation(files: string[]): KeyValuePair {
		for (const file of files) {
			const fullPath: string = this.app.configPath(file);
			if (existsSync(fullPath)) {
				const config: KeyValuePair =
					extname(fullPath) === ".json"
						? JSON.parse(readFileSync(fullPath).toString())
						: importFresh(fullPath);

				assert.defined<KeyValuePair>(config);

				return config;
			}
		}

		throw new Exceptions.FileException(`Failed to discovery any files matching [${files.join(", ")}].`);
	}

	#skipFileIfNotExists(filename: string, alwaysOptional = false): boolean {
		if (!existsSync(this.app.configPath(filename))) {
			return alwaysOptional || this.configFlags.allowMissingConfigFiles === true;
		}

		return false;
	}
}
