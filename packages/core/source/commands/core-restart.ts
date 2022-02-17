import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "core:restart";

	public description = "Restart the Core process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string().default("ark"));
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "core").restart();
	}
}
