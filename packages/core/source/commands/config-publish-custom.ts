import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { http } from "@mainsail/utils";
import { copySync, ensureDirSync, existsSync, removeSync, writeFileSync } from "fs-extra";
import Joi from "joi";
import { join, resolve } from "path";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:publish:custom";

	public description = "Publish the configuration.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
			.setFlag("app", "The link to the app.json file.", Joi.string().uri().required())
			.setFlag("crypto", "The link to the app.json file.", Joi.string().uri().required())
			.setFlag("reset", "Using the --reset flag will overwrite existing configuration.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		await this.#publish({ ...this.getFlags() });
	}

	async #publish(flags: Contracts.AnyObject): Promise<void> {
		this.app
			.rebind(Identifiers.ApplicationPaths)
			.toConstantValue(
				this.environment.getPaths(flags.token, flags.network, this.app.get(Identifiers.Application.Name)),
			);

		const configDestination = this.app.getCorePath("config");
		const configSource = resolve(
			__dirname,
			`../../bin/config/testnet/${this.app.get(Identifiers.Application.Name)}`,
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
			// {
			// 	task: async () => copySync("test", join(configDestination, "app.json")),
			// 	title: "Publish app.json",
			// },
			{
				task: async () => writeFileSync(join(configDestination, "app.json"), await this.#getFile(flags.app)),
				title: "Publish app.json",
			},
			{
				task: async () =>
					writeFileSync(join(configDestination, "crypto.json"), await this.#getFile(flags.crypto)),
				title: "Publish crypto.json",
			},
		]);
	}

	async #getFile(url: string): Promise<string> {
		const { data } = await http.get(url);

		return data;
	}
}
