import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "core:start";

	public description = "Start the API process.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("daemon", "Start the API process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`${flags.token}-api`);

		await this.actions.daemonizeProcess(
			{
				args: `core:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `${flags.token}-api`,
				script: resolve(__dirname, "../../bin/run"),
			},
			flags,
		);
	}
}
