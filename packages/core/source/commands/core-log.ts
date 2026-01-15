import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:log";

	public description = "Display the Core process log.";

	@postConstruct()
	public configure(): void {
		this.definition
			.setFlag("error", "Only display the error output.", Joi.boolean())
			.setFlag("lines", "The number of lines to output.", Joi.number().default(15));
	}

	public async execute(): Promise<void> {
		this.app
			.get<Contracts.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail")
			.log(this.getFlag("error"), this.getFlag("lines"));
	}
}
