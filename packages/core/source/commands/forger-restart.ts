import { Commands, Container } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "forger:restart";

	public description = "Restart the Forger process.";

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.app.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "forger").restart();
	}
}
