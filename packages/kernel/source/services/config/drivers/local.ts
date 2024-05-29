import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { dotenv, get, set } from "@mainsail/utils";
import { existsSync } from "fs";
import Joi from "joi";

import { KeyValuePair } from "../../../types/index.js";
import { assert } from "../../../utils/assert.js";
import { ConfigRepository } from "../repository.js";

@injectable()
export class LocalConfigLoader implements Contracts.Kernel.ConfigLoader {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Filesystem.Service)
	protected readonly filesystem!: Contracts.Kernel.Filesystem;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.Services.Validation.Service)
	private readonly validationService!: Contracts.Kernel.Validator;

	@inject(Identifiers.Config.Flags)
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
			this.#loadFromLocation("app.json"),
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
			...this.app.get<Contracts.Types.JsonObject>(Identifiers.Config.Flags),
			...get(this.validationService.valid(), "flags", {}),
		});

		this.configRepository.set("app.plugins", get(this.validationService.valid(), "plugins", []));
	}

	#loadPeers(): void {
		if (this.#skipFileIfNotExists("peers.json")) {
			return;
		}

		this.validationService.validate(
			this.#loadFromLocation("peers.json"),
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
			this.#loadFromLocation("validators.json"),
			Joi.object({
				keystore: Joi.string().optional(),
				secrets: Joi.array().items(Joi.string()).required(),
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

		this.configRepository.set("crypto", this.#loadFromLocation("crypto.json"));
	}

	#loadFromLocation(file: string): KeyValuePair {
		const fullPath: string = this.app.configPath(file);
		if (!existsSync(fullPath)) {
			throw new Exceptions.FileException(`Failed to discovery any files matching [${file}].`);
		}

		const config = this.filesystem.readJSONSync(fullPath);
		assert.defined<KeyValuePair>(config);
		return config;
	}

	#skipFileIfNotExists(filename: string, alwaysOptional = false): boolean {
		if (!existsSync(this.app.configPath(filename))) {
			return alwaysOptional || this.configFlags.allowMissingConfigFiles === true;
		}

		return false;
	}
}
