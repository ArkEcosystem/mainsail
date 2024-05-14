import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "tx-pool:log";

	public description = "Display the TX Pool process log.";

	public configure(): void {
		this.definition
			.setFlag("error", "Only display the error output.", Joi.boolean())
			.setFlag("lines", "The number of lines to output.", Joi.number().default(15));
	}

	public async execute(): Promise<void> {
		await this.app
			.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail-tx-pool")
			.log(this.getFlag("error"), this.getFlag("lines"));
	}
}
