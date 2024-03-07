// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Identifiers } from "@mainsail/cli";
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
		this.definition.setFlag("data", "Clear data path.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		// this.components.table(["Type", "Path"], (table) => {
		// 	for (const [type, path] of Object.entries<{}>(this.app.get(Identifiers.ApplicationPaths))) {
		// 		table.push([type, path]);
		// 	}
		// });

		if (this.hasFlag("data")) {
			await this.#clear("Data", this.app.get<{ data: string }>(Identifiers.ApplicationPaths).data);
		}

		if (this.hasFlag("state-export")) {
			const path = join(this.app.get<{ data: string }>(Identifiers.ApplicationPaths).data, "state-export");
			await this.#clear("State export", path);
		}

		if (this.hasFlag("plugins")) {
			const path = join(this.app.get<{ data: string }>(Identifiers.ApplicationPaths).data, "plugins");
			await this.#clear("Plugins", path);
		}
	}

	async #clear(name, path: string) {
		if (existsSync(path) && readdirSync(path).length > 0) {
			emptyDirSync(path);

			this.components.log(`${name} path (${path}) has been cleared.`);
		}
	}
}
