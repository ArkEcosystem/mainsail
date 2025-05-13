import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail").restart();
	}
}
