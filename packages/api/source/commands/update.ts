import { Commands, Contracts } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.Updater)
	private readonly updater!: Contracts.Updater;

	public signature = "update";

	public description = "Update the Core installation.";

	@postConstruct()
	public configure(): void {
		this.definition
			.setFlag("updateProcessManager", "Update process manager.", Joi.boolean().default(false))
			.setFlag("restart", "Restart all running processes.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		const hasNewVersion: boolean = await this.updater.check();

		if (hasNewVersion) {
			await this.updater.update(this.getFlag<boolean>("updateProcessManager"), this.getFlag<boolean>("force"));

			if (this.hasFlag("restart")) {
				this.actions.restartRunningProcess(`mainsail-api`);
			} else if (!this.getFlag<boolean>("force")) {
				await this.actions.restartRunningProcessWithPrompt(`mainsail-api`);
			}
		} else {
			this.components.success(`You already have the latest version (${this.pkg.version})`);
		}
	}
}
