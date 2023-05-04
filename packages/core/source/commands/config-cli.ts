import { Commands, Container, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.Installer)
	private readonly installer!: Services.Installer;

	public signature = "config:cli";

	public description = "Update the CLI configuration.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("channel", "The NPM registry channel that should be used.", Joi.string().valid("next", "latest"));
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("token")) {
			this.config.set("token", this.getFlag("token"));
		}

		if (this.hasFlag("channel")) {
			const newChannel: string = this.getFlag("channel");
			const oldChannel: string = this.config.get("channel");

			if (oldChannel === newChannel) {
				this.components.fatal(`You are already on the "${newChannel}" channel.`);
			}

			this.config.set("channel", newChannel);

			const spinner = this.components.spinner(`Installing ${this.pkg.name}@${newChannel}`);

			spinner.start();

			this.installer.install(this.pkg.name, newChannel);

			spinner.succeed();

			await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-core`);
			await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-relay`);
			await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-forger`);
		}
	}
}
