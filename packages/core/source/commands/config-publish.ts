import { resolve } from "path";
import { Commands, Container, Contracts, Services } from "@arkecosystem/core-cli";
import { Networks } from "@arkecosystem/crypto";
import { copySync, ensureDirSync, existsSync, removeSync } from "fs-extra";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:publish";

	public description = "Publish the configuration.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
			.setFlag("reset", "Using the --reset flag will overwrite existing configuration.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		if (this.hasFlag("network")) {
			return this.performPublishment(this.getFlags());
		}

		const response = await this.components.prompt([
			{
				choices: Object.keys(Networks).map((network) => ({ title: network, value: network })),
				message: "Please select which network you want to operate on",
				name: "network",
				type: "select",
			},
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

		await this.performPublishment({ ...response, ...this.getFlags() });
	}

	private async performPublishment(flags: Contracts.AnyObject): Promise<void> {
		this.app
			.rebind(Container.Identifiers.ApplicationPaths)
			.toConstantValue(this.environment.getPaths(flags.token, flags.network));

		const configDest = this.app.getCorePath("config");
		const configSrc = resolve(__dirname, `../../bin/config/${flags.network}`);

		await this.components.taskList([
			{
				task: () => {
					if (flags.reset) {
						removeSync(configDest);
					}

					if (existsSync(configDest)) {
						this.components.fatal("Please use the --reset flag if you wish to reset your configuration.");
					}

					if (!existsSync(configSrc)) {
						this.components.fatal(`Couldn't find the core configuration files at ${configSrc}.`);
					}

					ensureDirSync(configDest);
				},
				title: "Prepare directories",
			},
			{
				task: () => {
					if (!existsSync(`${configSrc}/.env`)) {
						this.components.fatal(`Couldn't find the environment file at ${configSrc}/.env.`);
					}

					copySync(`${configSrc}/.env`, `${configDest}/.env`);
				},
				title: "Publish environment",
			},
			{ task: () => copySync(configSrc, configDest), title: "Publish configuration" },
		]);
	}
}
