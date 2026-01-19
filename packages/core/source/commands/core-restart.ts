import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.Cli.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail").restart();
	}
}
