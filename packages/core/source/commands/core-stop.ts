import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "core:stop";

	public description = "Stop the Core process.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("daemon", "Stop the Core process or daemon.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		this.app
			.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "core")
			.stop(this.getFlag("daemon"));
	}
}
