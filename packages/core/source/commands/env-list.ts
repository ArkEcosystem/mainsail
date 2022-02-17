import { Commands, Container } from "@arkecosystem/core-cli";
import { Networks } from "@arkecosystem/crypto";
import { parseFileSync } from "envfile";
import { existsSync } from "fs-extra";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "env:list";

	public description = "List all environment variables.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)));
	}

	public async execute(): Promise<void> {
		const envFile: string = this.app.getCorePath("config", ".env");

		if (!existsSync(envFile)) {
			this.components.fatal(`No environment file found at ${envFile}.`);
		}

		this.components.table(["Key", "Value"], (table) => {
			const env = parseFileSync(envFile);

			for (const [key, value] of Object.entries(env)) {
				table.push([key, value]);
			}
		});
	}
}
