import { Kernel } from "@arkecosystem/core-contracts";
import { dotenv, get, set } from "@arkecosystem/utils";
import { existsSync, readFileSync } from "fs";
import importFresh from "import-fresh";
import Joi from "joi";
import { extname } from "path";

import {
	ApplicationConfigurationCannotBeLoaded,
	EnvironmentConfigurationCannotBeLoaded,
} from "../../../exceptions/config";
import { FileException } from "../../../exceptions/filesystem";
import { Identifiers, inject, injectable } from "../../../ioc";
import { JsonObject, KeyValuePair, Primitive } from "../../../types";
import { assert } from "../../../utils";
import { ConfigRepository } from "../repository";

const processSchema = {
	flags: Joi.array().items(Joi.string()).optional(),
	plugins: Joi.array()
		.items(Joi.object().keys({ options: Joi.object().optional(), package: Joi.string() }))
		.required(),
	services: Joi.object().optional(),
};

@injectable()
export class LocalConfigLoader implements Kernel.ConfigLoader {
	@inject(Identifiers.Application)
	protected readonly app!: Kernel.Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.ValidationService)
	private readonly validationService!: Kernel.Validator;

	public async loadEnvironmentVariables(): Promise<void> {
		try {
			const config: Record<string, Primitive> = dotenv.parseFile(this.app.environmentFile());

			for (const [key, value] of Object.entries(config)) {
				if (process.env[key] === undefined) {
					set(process.env, key, value);
				}
			}
		} catch (error) {
			throw new EnvironmentConfigurationCannotBeLoaded(error.message);
		}
	}

	public async loadConfiguration(): Promise<void> {
		try {
			this.loadApplication();

			this.loadPeers();

			this.loadDelegates();

			this.loadCryptography();
		} catch (error) {
			throw new ApplicationConfigurationCannotBeLoaded(error.message);
		}
	}

	private loadApplication(): void {
		const processType: string = this.app.get<KeyValuePair>(Identifiers.ConfigFlags).processType;

		this.validationService.validate(
			this.loadFromLocation(["app.json", "app.js"]),
			Joi.object({
				core: Joi.object().keys(processSchema).required(),
				forger: Joi.object().keys(processSchema).required(),
				relay: Joi.object().keys(processSchema).required(),
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

	private loadDelegates(): void {
		this.validationService.validate(
			this.loadFromLocation(["delegates.json"]),
			Joi.object({
				bip38: Joi.string().optional(),
				secrets: Joi.array().items(Joi.string()).optional(),
			}),
		);

		if (this.validationService.fails()) {
			throw new Error(JSON.stringify(this.validationService.errors()));
		}

		this.configRepository.set("delegates", this.validationService.valid());
	}

	private loadCryptography(): void {
		const files: string[] = ["genesisBlock", "milestones", "network"];

		for (const file of files) {
			if (!existsSync(this.app.configPath(`crypto/${file}.json`))) {
				return;
			}
		}

		for (const file of files) {
			this.configRepository.set(`crypto.${file}`, this.loadFromLocation([`crypto/${file}.json`]));
		}
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

		throw new FileException(`Failed to discovery any files matching [${files.join(", ")}].`);
	}
}
