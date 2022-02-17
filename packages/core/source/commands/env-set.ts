import { Commands, Container, Services } from "@arkecosystem/core-cli";
import { Networks } from "@arkecosystem/crypto";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature: string = "env:set";

	public description: string = "Set the value of an environment variable.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
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
