import type { Contracts } from "@mainsail/contracts";

import { Commands } from "@mainsail/cli";
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
		this.definition.setFlag("state-export", "Clear state exports.", Joi.boolean().default(false));
		this.definition.setFlag("plugins", "Clear installed plugins.", Joi.boolean().default(false));
		this.definition.setFlag("data", "Clear data.", Joi.boolean().default(false));
		this.definition.setFlag("consensusData", "Clear consensus data.", Joi.boolean().default(false));
		this.definition.setFlag("txPoolData", "Clear transaction pool data.", Joi.boolean().default(false));
		this.definition.setFlag("config", "Clear config.", Joi.boolean().default(false));
		this.definition.setFlag("cache", "Clear cache.", Joi.boolean().default(false));
		this.definition.setFlag("log", "Clear log.", Joi.boolean().default(false));
		this.definition.setFlag("temp", "Clear temp.", Joi.boolean().default(false));
		this.definition.setFlag("all", "Clear all.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const all = this.getFlag<boolean>("all");

		if (this.getFlag<boolean>("data") || all) {
			await this.#clearDir("Data", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.getFlag<boolean>("consensusData")) {
			await this.#clearDb("consensus", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.getFlag<boolean>("txPoolData")) {
			await this.#clearDb(
				"transaction-pool",
				this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data,
			);
		}

		if (this.getFlag<boolean>("config") || all) {
			await this.#clearDir("Config", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).config);
		}

		if (this.getFlag<boolean>("cache") || all) {
			await this.#clearDir("Cache", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).cache);
		}

		if (this.getFlag<boolean>("log") || all) {
			await this.#clearDir("Log", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).log);
		}
		if (this.getFlag<boolean>("temp") || all) {
			await this.#clearDir("Temp", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).temp);
		}

		if (this.getFlag<boolean>("state-export")) {
			await this.#clearDir(
				"State export",
				join(this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data, "state-export"),
			);
		}

		if (this.getFlag<boolean>("plugins")) {
			await this.#clearDir(
				"Plugins",
				join(this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data, "plugins"),
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
