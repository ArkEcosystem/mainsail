import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "tx-pool:restart";

	public description = "Restart the TX Pool process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail-tx-pool").restart();
	}
}
