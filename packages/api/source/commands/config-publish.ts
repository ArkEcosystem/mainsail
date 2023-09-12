import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { copySync, ensureDirSync, existsSync, removeSync } from "fs-extra";
import Joi from "joi";
import { join, resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:publish";

	public description = "Publish the configuration.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
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
		this.app
			.rebind(Identifiers.ApplicationPaths)
			.toConstantValue(this.environment.getPaths(flags.token, flags.network));

		const configDestination = this.app.getCorePath("config");
		const configSource = resolve(__dirname, `../../bin/config/${flags.network}`);

		await this.components.taskList([
			// TODO: overwrites core .env... so ideally we would use separate folders for core and api?
			// {
			// 	task: () => {
			// 		if (!existsSync(`${configSource}/.env`)) {
			// 			this.components.fatal(`Couldn't find the environment file at ${configSource}/.env.`);
			// 		}

			// 		copySync(`${configSource}/.env`, `${configDestination}/.env`);
			// 	},
			// 	title: "Publish environment",
			// },
			{
				task: () => {
					if (existsSync(join(configDestination, "api.json"))) {
						if (flags.reset) {
							removeSync(join(configDestination, "api.json"));
						} else {
							this.components.fatal("Please use the --reset flag if you wish to reset your configuration.");
						}
					}

					ensureDirSync(configDestination);
					copySync(join(configSource, "api.json"), join(configDestination, "api.json"));
				},
				title: "Publish api.json"
			},
		]);
	}
}
