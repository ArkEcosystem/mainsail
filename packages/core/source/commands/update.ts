import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import { Utils } from "@arkecosystem/core-kernel";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.Updater)
	private readonly updater!: Contracts.Updater;

	public signature = "update";

	public description = "Update the Core installation.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("force", "Force an update.", Joi.boolean().default(false))
			.setFlag("updateProcessManager", "Update process manager.", Joi.boolean())
			.setFlag("restart", "Restart all running processes.", Joi.boolean())
			.setFlag("restartCore", "Restart the Core process.", Joi.boolean())
			.setFlag("restartRelay", "Restart the Relay process.", Joi.boolean())
			.setFlag("restartForger", "Restart the Forger process.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		const hasNewVersion: boolean = await this.updater.check();

		if (hasNewVersion) {
			await this.updater.update(this.getFlag("updateProcessManager"), this.getFlag("force"));

			if (this.hasRestartFlag()) {
				if (this.hasFlag("restart")) {
					this.actions.restartRunningProcess(`${this.getFlag("token")}-core`);
					this.actions.restartRunningProcess(`${this.getFlag("token")}-relay`);
					this.actions.restartRunningProcess(`${this.getFlag("token")}-forger`);
				} else {
					if (this.hasFlag("restartCore")) {
						this.actions.restartRunningProcess(`${this.getFlag("token")}-core`);
					}

					if (this.hasFlag("restartRelay")) {
						this.actions.restartRunningProcess(`${this.getFlag("token")}-relay`);
					}

					if (this.hasFlag("restartForger")) {
						this.actions.restartRunningProcess(`${this.getFlag("token")}-forger`);
					}
				}
			} else if (!this.getFlag("force")) {
				await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-core`);
				await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-relay`);
				await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-forger`);
			}
		} else {
			this.components.success(`You already have the latest version (${this.pkg.version})`);
		}
	}

	private hasRestartFlag(): boolean {
		return Utils.hasSomeProperty(this.getFlags(), ["restart", "restartCore", "restartRelay", "restartForger"]);
	}
}
