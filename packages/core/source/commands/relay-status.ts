import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "relay:status";

	public description = "Display the Relay process status.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "relay").status();
	}
}
