// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths";

	public description = "Get all of the environment paths.";

	public async execute(): Promise<void> {
		this.components.table(["Type", "Path"], (table) => {
			for (const [type, path] of Object.entries(
				this.app.get<Contracts.Flags>(Identifiers.Cli.Paths.Application),
			)) {
				table.push([type, path]);
			}
		});
	}
}
