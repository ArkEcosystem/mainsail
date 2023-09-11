import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:run";

	public description = "Run the Core process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		await Utils.Builder.buildApplication({
			flags,
			plugins: {},
		});

		// Prevent resolving execute method
		return new Promise(() => { });
	}
}
