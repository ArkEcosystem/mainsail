import { Commands, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string().required());
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Identifiers.ProcessFactory)("mainsail").restart();
	}
}
