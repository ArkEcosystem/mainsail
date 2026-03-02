import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:log";

	public description = "Display the API process log.";

	@postConstruct()
	public configure(): void {
		this.definition
			.setFlag("error", "Only display the error output.", Joi.boolean())
			.setFlag("lines", "The number of lines to output.", Joi.number().default(15));
	}

	public async execute(): Promise<void> {
		this.app
			.get<Contracts.Cli.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail-api")
			.log(this.getFlag<boolean>("error"), this.getFlag<number>("lines"));
	}
}
