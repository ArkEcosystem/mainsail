// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Container, Services } from "@arkecosystem/core-cli";
import { inject, injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "env:set";

	public description = "Set the value of an environment variable.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag(
				"key",
				"The environment variable that you wish to set.",
				Joi.alternatives().try(Joi.string(), Joi.number()).required(),
			)
			.setFlag(
				"value",
				"The value that you wish to set the environment variable to.",
				Joi.alternatives().try(Joi.string(), Joi.number()).required(),
			);
	}

	public async execute(): Promise<void> {
		this.environment.updateVariables(this.app.getCorePath("config", ".env"), {
			[this.getFlag("key")]: this.getFlag("value"),
		});
	}
}
