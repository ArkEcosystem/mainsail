import { Commands, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:status";

	public description = "Display the status of the API process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Identifiers.ProcessFactory)(this.getFlag("token"), "api").status();
	}
}
