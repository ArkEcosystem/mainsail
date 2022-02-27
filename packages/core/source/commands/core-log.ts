import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "core:log";

	public description = "Display the Core process log.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("error", "Only display the error output.", Joi.boolean())
			.setFlag("lines", "The number of lines to output.", Joi.number().default(15));
	}

	public async execute(): Promise<void> {
		await this.app
			.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "core")
			.log(this.getFlag("error"), this.getFlag("lines"));
	}
}
