import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "forger:log";

	public description = "Display the Forger process log.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("error", "Only display the error output.", Joi.boolean())
			.setFlag("lines", "The number of lines to output.", Joi.number().default(15));
	}

	public async execute(): Promise<void> {
		await this.app
			.get<any>(Container.Identifiers.ProcessFactory)(this.getFlag("token"), "forger")
			.log(this.getFlag("error"), this.getFlag("lines"));
	}
}
