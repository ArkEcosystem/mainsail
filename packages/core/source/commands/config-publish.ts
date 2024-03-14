import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { existsSync } from "fs";
import { copySync, ensureDirSync, removeSync } from "fs-extra/esm";
import Joi from "joi";
import { resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:publish";

	public description = "Publish the configuration.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("reset", "Using the --reset flag will overwrite existing configuration.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("network")) {
			return this.#performPublishment(this.getFlags());
		}

		const response = await this.components.prompt([
			// {
			// 	choices: Object.keys(Networks).map((network) => ({ title: network, value: network })),
			// 	message: "Please select which network you want to operate on",
			// 	name: "network",
			// 	type: "select",
			// },
			{
				message: "Can you confirm?",
				name: "confirm",
				type: "confirm",
			},
		]);

		if (!response.network) {
			this.components.fatal("You'll need to select the network to continue.");
		}

		if (!response.confirm) {
			this.components.fatal("You'll need to confirm the network to continue.");
		}

		await this.#performPublishment({ ...response, ...this.getFlags() });
	}

	async #performPublishment(flags: Contracts.AnyObject): Promise<void> {
		this.app.rebind(Identifiers.ApplicationPaths).toConstantValue(this.environment.getPaths());

		const dirname = (() => {
			try {
				return new URL(".", import.meta.url).pathname;
			} catch {
				// eslint-disable-next-line unicorn/prefer-module
				return __dirname;
			}
		})();

		const configDestination = this.app.getCorePath("config");
		const configSource = resolve(
			dirname,
			`../../bin/config/${flags.network}/${this.app.get<string>(Identifiers.Application.Name)}`,
		);

		await this.components.taskList([
			{
				task: () => {
					if (flags.reset) {
						removeSync(configDestination);
					}

					if (existsSync(configDestination)) {
						this.components.fatal("Please use the --reset flag if you wish to reset your configuration.");
					}

					if (!existsSync(configSource)) {
						this.components.fatal(`Couldn't find the core configuration files at ${configSource}.`);
					}

					ensureDirSync(configDestination);
				},
				title: "Prepare directories",
			},
			{
				task: () => {
					if (!existsSync(`${configSource}/.env`)) {
						this.components.fatal(`Couldn't find the environment file at ${configSource}/.env.`);
					}

					copySync(`${configSource}/.env`, `${configDestination}/.env`);
				},
				title: "Publish environment",
			},
			{ task: () => copySync(configSource, configDestination), title: "Publish configuration" },
		]);
	}
}
