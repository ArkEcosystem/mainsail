import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:stop";

	public description = "Stop the API process.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("daemon", "Stop the Core process or daemon.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		this.app
			.get<Contracts.Cli.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail-api")
			.stop(this.getFlag<boolean>("daemon"));
	}
}
