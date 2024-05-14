import { Commands, Contracts, Identifiers, Utils } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Setup)
	private readonly setup!: Contracts.Setup;

	public signature = "tx-pool:start";

	public description = "Start the TX Pool process.";

	public configure(): void {
		this.definition
			.setFlag("env", "", Joi.string().default("production"))
			.setFlag("daemon", "Start the API process as a daemon.", Joi.boolean().default(true))
			.setFlag("skipPrompts", "Skip prompts.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };

		this.actions.abortRunningProcess(`mainsail-tx-pool`);

		await this.actions.daemonizeProcess(
			{
				args: `tx-pool:run ${Utils.Flags.castFlagsToString(flags, ["daemon"])}`,
				name: `mainsail-tx-pool`,
				script: this.setup.isGlobal()
					? this.setup.getGlobalEntrypoint("@mainsail/transaction-pool")
					: this.setup.getEntrypoint(),
			},
			flags,
		);
	}
}
