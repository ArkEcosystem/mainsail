import { Commands, Utils } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.Setup)
	private readonly setup!: Contracts.Cli.Setup;

	public signature = "api:start";

	public description = "Start the API process.";

	@postConstruct()
	public configure(): void {
		this.definition
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("daemon", "Start the API process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.Cli.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`mainsail-api`);

		await this.actions.daemonizeProcess(
			{
				args: `api:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `mainsail-api`,
				script: this.setup.isGlobal()
					? this.setup.getGlobalEntrypoint("@mainsail/api")
					: this.setup.getEntrypoint(),
			},
			flags,
		);
	}
}
