import { Commands, Container } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "relay:stop";

	public description = "Stop the Relay process.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("daemon", "Stop the Relay process or daemon.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		this.app
			.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "relay")
			.stop(this.getFlag("daemon"));
	}
}
