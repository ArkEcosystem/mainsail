import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:status";

	public description = "Display the status of the Core process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string().required());
	}

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail").status();
	}
}
