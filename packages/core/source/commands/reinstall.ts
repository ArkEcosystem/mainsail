import { Commands, Container, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.Installer)
	private readonly installer!: Services.Installer;

	@inject(Container.Identifiers.ProcessManager)
	private readonly processManager!: Services.ProcessManager;

	public signature = "reinstall";

	public description = "Reinstall the Core installation";

	public requiresNetwork = false;

	public configure(): void {
		this.definition.setFlag("force", "Force a reinstall.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		if (this.getFlag("force")) {
			return this.#performInstall();
		}

		if (await this.components.confirm("Are you sure you want to reinstall?")) {
			//Come back to this
			return this.#performInstall();
		}

		this.components.fatal("You'll need to confirm the reinstall to continue.");
	}

	async #performInstall(): Promise<void> {
		const spinner = this.components.spinner(`Reinstalling ${this.pkg.version}`);

		spinner.start();

		this.installer.install(this.pkg.name, this.pkg.version);

		this.processManager.update();

		spinner.succeed();

		await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-core`);
		await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-relay`);
		await this.actions.restartRunningProcessWithPrompt(`${this.getFlag("token")}-forger`);
	}
}
