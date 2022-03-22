// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands, Container } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "env:paths";

	public description = "Get all of the environment paths.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.components.table(["Type", "Path"], (table) => {
			for (const [type, path] of Object.entries(this.app.get(Container.Identifiers.ApplicationPaths))) {
				table.push([type, path]);
			}
		});
	}
}
