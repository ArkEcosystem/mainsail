// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import { existsSync, readdirSync } from "fs";
import { emptyDirSync, removeSync } from "fs-extra/esm";
import Joi from "joi";
import { join } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths:clear";

	public description = "Clear data on environment paths.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("state-export", "Clear state exports.", Joi.boolean());
		this.definition.setFlag("plugins", "Clear installed plugins.", Joi.boolean());
		this.definition.setFlag("data", "Clear data.", Joi.boolean());
		this.definition.setFlag("consensusData", "Clear consensus data.", Joi.boolean());
		this.definition.setFlag("txPoolData", "Clear transaction pool data.", Joi.boolean());
		this.definition.setFlag("config", "Clear config.", Joi.boolean());
		this.definition.setFlag("cache", "Clear cache.", Joi.boolean());
		this.definition.setFlag("log", "Clear log.", Joi.boolean());
		this.definition.setFlag("temp", "Clear temp.", Joi.boolean());
		this.definition.setFlag("all", "Clear all.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("data") || this.hasFlag("all")) {
			await this.#clearDir("Data", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.hasFlag("consensusData")) {
			await this.#clearDb("consensus", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.hasFlag("txPoolData")) {
			await this.#clearDb(
				"transaction-pool",
				this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).data,
			);
		}

		if (this.hasFlag("config") || this.hasFlag("all")) {
			await this.#clearDir("Config", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).config);
		}

		if (this.hasFlag("cache") || this.hasFlag("all")) {
			await this.#clearDir("Cache", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).cache);
		}

		if (this.hasFlag("log") || this.hasFlag("all")) {
			await this.#clearDir("Log", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).log);
		}
		if (this.hasFlag("temp") || this.hasFlag("all")) {
			await this.#clearDir("Temp", this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).temp);
		}

		if (this.hasFlag("state-export")) {
			await this.#clearDir(
				"State export",
				join(this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).data, "state-export"),
			);
		}

		if (this.hasFlag("plugins")) {
			await this.#clearDir(
				"Plugins",
				join(this.app.get<Contracts.Paths>(Identifiers.Cli.Paths.Application).data, "plugins"),
			);
		}
	}

	async #clearDir(name: string, path: string) {
		if (existsSync(path) && readdirSync(path).length > 0) {
			emptyDirSync(path);

			this.components.log(`${name} path (${path}) has been cleared.`);
		}
	}

	async #clearDb(nameLike: string, path: string) {
		if (existsSync(path)) {
			const files = readdirSync(path).filter((file) => file.includes(nameLike));

			if (files.length === 0) {
				return;
			}

			for (const file of files) {
				removeSync(join(path, file));
			}

			this.components.log(`Cleared ${files.length} file(s) in path (${path}): ${files.join(", ")}`);
		}
	}
}
