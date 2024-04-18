import { Commands, Contracts, Identifiers, Utils } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Setup)
	private readonly setup!: Contracts.Setup;

	public signature = "core:start";

	public description = "Start the Core process.";

	public configure(): void {
		this.definition
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("disableDiscovery", "Permanently disable all peer discovery.", Joi.boolean())
			.setFlag("skipDiscovery", "Skip the initial peer discovery.", Joi.boolean())
			.setFlag("ignoreMinimumNetworkReach", "Ignore the minimum network reach on start.", Joi.boolean())
			.setFlag("launchMode", "The mode the relay will be launched in (seed only at the moment).", Joi.string())
			.setFlag("daemon", "Start the Core process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`mainsail`);

		await this.actions.daemonizeProcess(
			{
				args: `core:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `mainsail`,
				script: this.setup.isGlobal()
					? this.setup.getGlobalEntrypoint("@mainsail/core")
					: this.setup.getEntrypoint(),
			},
			flags,
		);
	}
}
