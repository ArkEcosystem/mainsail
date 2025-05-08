import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable, injectFromBase } from "@mainsail/container";

@injectable()
@injectFromBase()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail").restart();
	}
}
