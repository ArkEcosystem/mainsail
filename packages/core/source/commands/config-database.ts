import { Commands, Container, Contracts, Services } from "@arkecosystem/core-cli";
import { inject, injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:database";

	public description = "Update the Database configuration.";

	readonly #validFlags: string[] = ["host", "port", "database", "username", "password"];

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("host", "The host address of the database.", Joi.string())
			.setFlag("port", "The port of the database.", Joi.number())
			.setFlag("database", "The name of the database.", Joi.string())
			.setFlag("username", "The name of the database user.", Joi.string())
			.setFlag("password", "The password of the database user.", Joi.string());
	}

	public async execute(): Promise<void> {
		const environmentFile = this.app.getCorePath("config", ".env");

		if (this.#validFlags.some((flag: string) => this.hasFlag(flag))) {
			this.environment.updateVariables(environmentFile, this.#confirm(this.getFlags()));

			return;
		}

		const response = await this.components.prompt([
			{
				initial: "localhost",
				message: "What host do you want to use?",
				name: "host",
				type: "text",
			},
			{
				initial: 5432,
				message: "What port do you want to use?",
				name: "port",
				type: "text",
				validate: (value) =>
					/* c8 ignore next */
					value < 1 || value > 65_535 ? `The port must be in the range of 1-65535.` : true,
			},
			{
				initial: `${this.getFlag("token")}_${this.getFlag("network")}`,
				message: "What database do you want to use?",
				name: "database",
				type: "text",
			},
			{
				initial: this.getFlag("token"),
				message: "What username do you want to use?",
				name: "username",
				type: "text",
			},
			{
				initial: "password",
				message: "What password do you want to use?",
				name: "password",
				type: "password",
			},
			{
				message: "Can you confirm?",
				name: "confirm",
				type: "confirm",
			},
		]);

		if (!response.confirm) {
			this.components.fatal("You'll need to confirm the input to continue.");
		}

		this.environment.updateVariables(environmentFile, this.#confirm(response));
	}

	#confirm(flags: Contracts.AnyObject): Contracts.AnyObject {
		const variables: Contracts.AnyObject = {};

		for (const option of this.#validFlags) {
			if (flags[option] !== undefined) {
				variables[`CORE_DB_${option.toUpperCase()}`] = flags[option];
			}
		}

		return variables;
	}
}
