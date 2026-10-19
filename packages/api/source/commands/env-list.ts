import { Commands } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

import { loadEnvironmentFile } from "../helpers.js";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:list";

	public description = "List all environment variables.";

	public async execute(): Promise<void> {
		const environment = loadEnvironmentFile(this.app, this.components);

		this.components.table(["Key", "Value"], (table) => {
			for (const [key, value] of Object.entries(environment)) {
				table.push([key, value]);
			}
		});
	}
}
