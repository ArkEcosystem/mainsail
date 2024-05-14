import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Updater)
	private readonly updater!: Contracts.Updater;

	public signature = "update";

	public description = "Update the Core installation.";

	public configure(): void {
		this.definition
			.setFlag("updateProcessManager", "Update process manager.", Joi.boolean().default(false))
			.setFlag("restart", "Restart all running processes.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		const hasNewVersion: boolean = await this.updater.check();

		if (hasNewVersion) {
			await this.updater.update(this.getFlag("updateProcessManager"), this.getFlag("force"));

			if (this.hasFlag("restart")) {
				this.actions.restartRunningProcess(`mainsail-api`);
			} else if (!this.getFlag("force")) {
				await this.actions.restartRunningProcessWithPrompt(`mainsail-api`);
			}
		} else {
			this.components.success(`You already have the latest version (${this.pkg.version})`);
		}
	}
}
