// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { emptyDirSync, existsSync, readdirSync } from "fs-extra";
import Joi from "joi";
import { join } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths:clear";

	public description = "Clear data on environment paths.";

	public configure(): void {
		this.definition.setFlag("state-export", "Clear state exports.", Joi.boolean());
		this.definition.setFlag("plugins", "Clear installed plugins.", Joi.boolean());
		this.definition.setFlag("data", "Clear data.", Joi.boolean());
		this.definition.setFlag("config", "Clear config.", Joi.boolean());
		this.definition.setFlag("cache", "Clear cache.", Joi.boolean());
		this.definition.setFlag("log", "Clear log.", Joi.boolean());
		this.definition.setFlag("temp", "Clear temp.", Joi.boolean());
		this.definition.setFlag("all", "Clear all.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("data") || this.hasFlag("all")) {
			await this.#clear("Data", this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).data);
		}

		if (this.hasFlag("config") || this.hasFlag("all")) {
			await this.#clear("Config", this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).config);
		}

		if (this.hasFlag("cache") || this.hasFlag("all")) {
			await this.#clear("Cache", this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).cache);
		}

		if (this.hasFlag("log") || this.hasFlag("all")) {
			await this.#clear("Log", this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).log);
		}
		if (this.hasFlag("temp") || this.hasFlag("all")) {
			await this.#clear("Temp", this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).temp);
		}

		if (this.hasFlag("state-export")) {
			await this.#clear(
				"State export",
				join(this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).data, "state-export"),
			);
		}

		if (this.hasFlag("plugins")) {
			await this.#clear(
				"Plugins",
				join(this.app.get<Contracts.Paths>(Identifiers.ApplicationPaths).data, "plugins"),
			);
		}
	}

	async #clear(name, path: string) {
		if (existsSync(path) && readdirSync(path).length > 0) {
			emptyDirSync(path);

			this.components.log(`${name} path (${path}) has been cleared.`);
		}
	}
}
