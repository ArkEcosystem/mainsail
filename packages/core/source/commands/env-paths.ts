// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths";

	public description = "Get all of the environment paths.";

	public async execute(): Promise<void> {
		this.components.table(["Type", "Path"], (table) => {
			for (const [type, path] of Object.entries(this.app.get<Contracts.Flags>(Identifiers.ApplicationPaths))) {
				table.push([type, path]);
			}
		});
	}
}
