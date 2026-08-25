import type { Contracts } from "@mainsail/contracts";

import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
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
		this.definition.setFlag("plugins", "Clear installed plugins.", Joi.boolean().default(false));
		this.definition.setFlag("data", "Clear data.", Joi.boolean().default(false));
		this.definition.setFlag("config", "Clear config.", Joi.boolean().default(false));
		this.definition.setFlag("cache", "Clear cache.", Joi.boolean().default(false));
		this.definition.setFlag("log", "Clear log.", Joi.boolean().default(false));
		this.definition.setFlag("temp", "Clear temp.", Joi.boolean().default(false));
		this.definition.setFlag("all", "Clear all.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const all = this.getFlag<boolean>("all");

		if (this.getFlag<boolean>("data") || all) {
			await this.#clear("Data", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).data);
		}

		if (this.getFlag<boolean>("config") || all) {
			await this.#clear("Config", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).config);
		}

		if (this.getFlag<boolean>("cache") || all) {
			await this.#clear("Cache", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).cache);
		}

		if (this.getFlag<boolean>("log") || all) {
			await this.#clear("Log", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).log);
		}
		if (this.getFlag<boolean>("temp") || all) {
			await this.#clear("Temp", this.app.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application).temp);
		}

		if (this.getFlag<boolean>("plugins")) {
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
