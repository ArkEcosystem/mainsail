// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { parse } from "envfile";
import { existsSync, readFileSync } from "fs-extra";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:list";

	public description = "List all environment variables.";

	public async execute(): Promise<void> {
		const environmentFile: string = this.app.getCorePath("config", ".env");

		if (!existsSync(environmentFile)) {
			this.components.fatal(`No environment file found at ${environmentFile}.`);
		}

		this.components.table(["Key", "Value"], (table) => {
			const environment: object = parse(readFileSync(environmentFile).toString("utf8"));

			for (const [key, value] of Object.entries(environment)) {
				table.push([key, value]);
			}
		});
	}
}
