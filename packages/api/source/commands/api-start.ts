import { Commands, Contracts, Utils } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:start";

	public description = "Start the API process.";

	public configure(): void {
		this.definition
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("daemon", "Start the API process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`mainsail-api`);

		const dirname = (() => {
			try {
				return new URL(".", import.meta.url).pathname;
			} catch {
				// eslint-disable-next-line unicorn/prefer-module
				return __dirname;
			}
		})();

		await this.actions.daemonizeProcess(
			{
				args: `api:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `mainsail-api`,
				script: resolve(dirname, "../../bin/run"),
			},
			flags,
		);
	}
}
