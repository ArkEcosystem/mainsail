import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "tx-pool:stop";

	public description = "Stop the TX Pool process.";

	public configure(): void {
		this.definition.setFlag("daemon", "Stop the Core process or daemon.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		this.app
			.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail-tx-pool")
			.stop(this.getFlag("daemon"));
	}
}
