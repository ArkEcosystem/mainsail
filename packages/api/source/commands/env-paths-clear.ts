// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { existsSync, readdirSync } from "fs";
import { emptyDirSync } from "fs-extra/esm";
import Joi from "joi";
import { join } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths:clear";

	public description = "Clear data on environment paths.";

	@postConstruct()
	public configure(): void {
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
			await this.#clear("Data", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.hasFlag("config") || this.hasFlag("all")) {
			await this.#clear("Config", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).config);
		}

		if (this.hasFlag("cache") || this.hasFlag("all")) {
			await this.#clear("Cache", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).cache);
		}

		if (this.hasFlag("log") || this.hasFlag("all")) {
			await this.#clear("Log", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).log);
		}
		if (this.hasFlag("temp") || this.hasFlag("all")) {
			await this.#clear("Temp", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).temp);
		}

		if (this.hasFlag("plugins")) {
			await this.#clear(
				"Plugins",
				join(this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data, "plugins"),
			);
		}
	}

	async #clear(name: string, path: string) {
		if (existsSync(path) && readdirSync(path).length > 0) {
			emptyDirSync(path);

			this.components.log(`${name} path (${path}) has been cleared.`);
		}
	}
}
