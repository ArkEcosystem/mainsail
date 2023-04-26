import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:status";

	public description = "Display the status of the Core process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "core").status();
	}
}
