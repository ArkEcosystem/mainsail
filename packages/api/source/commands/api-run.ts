import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { Utils as AppUtils } from "@mainsail/kernel";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:run";

	public description = "Run the API process in foreground. Exiting the process will stop it from running.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const { bin } = require(resolve(__dirname, "../../package.json"));
		AppUtils.assert.defined<Record<string, string>>(bin);

		const flags: Contracts.AnyObject = {
			...this.getFlags(),
			name: Object.keys(bin)[0],
			allowMissingConfigFiles: true,
		};

		await Utils.Builder.buildApplication({
			flags,
			plugins: {},
		});

		// Prevent resolving execute method
		return new Promise(() => { });
	}
}
