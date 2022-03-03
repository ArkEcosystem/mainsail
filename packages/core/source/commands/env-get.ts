import { Commands } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import { parseFileSync } from "envfile";
import { existsSync } from "fs-extra";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:get";

	public description = "Get the value of an environment variable.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag(
				"key",
				"The name of the environment variable that you wish to get the value of.",
				Joi.string().required(),
			);
	}

	public async execute(): Promise<void> {
		const environmentFile: string = this.app.getCorePath("config", ".env");

		if (!existsSync(environmentFile)) {
			this.components.fatal(`No environment file found at ${environmentFile}.`);
		}

		const environment: object = parseFileSync(environmentFile);
		const key: string = this.getFlag("key");

		if (!environment[key]) {
			this.components.fatal(`The "${key}" doesn't exist.`);
		}

		this.components.log(environment[key]);
	}
}
