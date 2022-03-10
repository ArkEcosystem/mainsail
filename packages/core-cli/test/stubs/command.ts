import Joi from "joi";
import { Commands, Container } from "../../source";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "config:cli";
	public description = "Update the CLI configuration.";

	public configure(): void {
		this.definition.setArgument("someArgument1", "description", Joi.string());
		this.definition.setArgument("someArgument11", "description", Joi.string());
		this.definition.setArgument("someArgument111", "description", Joi.string());

		this.definition.setFlag("someFlag1", "description", Joi.string());
		this.definition.setFlag("someFlag11", "description", Joi.string());
		this.definition.setFlag("someFlag111", "description", Joi.string());
	}

	public async execute(): Promise<void> {
		// Do nothing...
	}
}
