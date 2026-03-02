import { Commands } from "@mainsail/cli";
import { BuildPackages, Channels, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.Installer)
	private readonly installer!: Contracts.Cli.Installer;

	public signature = "config:cli";

	public description = "Update the CLI configuration.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag(
			"channel",
			"The NPM registry channel that should be used.",
			Joi.string().valid(...Channels),
		);
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("channel")) {
			const newChannel: string = this.getFlag("channel");
			const oldChannel: string = this.config.get("channel");

			if (oldChannel === newChannel) {
				this.components.fatal(`You are already on the "${newChannel}" channel.`);
			}

			this.config.set("channel", newChannel);

			const spinner = this.components.spinner(`Installing ${this.pkg.name}@${newChannel}`);

			spinner.start();

			assert.string(this.pkg.name);
			this.installer.install(this.pkg.name, BuildPackages, newChannel);

			spinner.succeed();

			await this.actions.restartRunningProcessWithPrompt(`mainsail`);
		}
	}
}
