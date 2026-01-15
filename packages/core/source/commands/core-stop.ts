import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:stop";

	public description = "Stop the Core process.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("daemon", "Stop the Core process or daemon.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail").stop(this.getFlag("daemon"));
	}
}
