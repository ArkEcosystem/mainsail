import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail").restart();
	}
}
