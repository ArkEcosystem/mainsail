import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { dotenv, get, set } from "@arkecosystem/utils";
import { existsSync, readFileSync } from "fs";
import importFresh from "import-fresh";
import Joi from "joi";
import { extname } from "path";

import { JsonObject, KeyValuePair, Primitive } from "../../../types";
import { assert } from "../../../utils";
import { ConfigRepository } from "../repository";

@injectable()
export class LocalConfigLoader implements Contracts.Kernel.ConfigLoader {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.ValidationService)
	private readonly validationService!: Contracts.Kernel.Validator;

	public async loadEnvironmentVariables(): Promise<void> {
		try {
			const config: Record<string, Primitive> = dotenv.parseFile(this.app.environmentFile());

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
			this.loadApplication();

			this.loadPeers();

			this.loadValidators();

			this.loadCryptography();
		} catch (error) {
			throw new Exceptions.ApplicationConfigurationCannotBeLoaded(error.message);
		}
	}

	private loadApplication(): void {
		const processType: string = this.app.get<KeyValuePair>(Identifiers.ConfigFlags).processType;

		this.validationService.validate(
			this.loadFromLocation(["app.json", "app.js"]),
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
			...this.app.get<JsonObject>(Identifiers.ConfigFlags),
			...get(this.validationService.valid(), `${processType}.flags`, {}),
		});

		this.configRepository.set("app.plugins", get(this.validationService.valid(), `${processType}.plugins`, []));
	}

	private loadPeers(): void {
		this.validationService.validate(
			this.loadFromLocation(["peers.json"]),
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

	private loadValidators(): void {
		this.validationService.validate(
			this.loadFromLocation(["validators.json"]),
			Joi.object({
				bip38: Joi.string().optional(),
				secrets: Joi.array().items(Joi.string()).optional(),
			}),
		);

		if (this.validationService.fails()) {
			throw new Error(JSON.stringify(this.validationService.errors()));
		}

		this.configRepository.set("validators", this.validationService.valid());
	}

	private loadCryptography(): void {
		if (!existsSync(this.app.configPath("crypto.json"))) {
			return;
		}

		this.configRepository.set("crypto", this.loadFromLocation(["crypto.json"]));
	}

	private loadFromLocation(files: string[]): KeyValuePair {
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
}
