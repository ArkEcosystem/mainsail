import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { http } from "@mainsail/utils";
import { ensureDirSync, existsSync, removeSync, writeFileSync } from "fs-extra";
import Joi from "joi";
import { join } from "path";

const ENV = `CORE_LOG_LEVEL=info
CORE_LOG_LEVEL_FILE=debug`;

const PEERS = {
	list: [
		{
			ip: "127.0.0.1",
			port: 4000,
		},
	],
};

const VALIDATORS = {
	secrets: [],
};

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Environment)
	private readonly environment!: Services.Environment;

	public signature = "config:publish:custom";

	public description = "Publish the configuration from online sources.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().required())
			.setFlag("network", "The name of the network.", Joi.string().required())
			.setFlag("app", "The link to the app.json file.", Joi.string().uri().required())
			.setFlag("peers", "The link to the peers.json file.", Joi.string().uri())
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

		await this.components.taskList([
			{
				task: () => {
					if (flags.reset) {
						removeSync(configDestination);
					}

					if (existsSync(configDestination)) {
						this.components.fatal("Please use the --reset flag if you wish to reset your configuration.");
					}

					ensureDirSync(configDestination);
				},
				title: "Prepare directories",
			},
			{
				task: () => writeFileSync(`${configDestination}/.env`, ENV),
				title: "Publish environment (.env)",
			},
			{
				task: () =>
					writeFileSync(`${configDestination}/validators.json`, JSON.stringify(VALIDATORS, undefined, 4)),
				title: "Publish validators (validators.json)",
			},
			{
				task: async () => {
					if (flags.peers) {
						writeFileSync(`${configDestination}/peers.json`, await this.#getFile(flags.peers));
					} else {
						writeFileSync(`${configDestination}/peers.json`, JSON.stringify(PEERS, undefined, 4));
					}
				},
				title: "Publish peers (peers.json)",
			},
			{
				task: async () => writeFileSync(join(configDestination, "app.json"), await this.#getFile(flags.app)),
				title: "Publish app (app.json)",
			},
			{
				task: async () =>
					writeFileSync(join(configDestination, "crypto.json"), await this.#getFile(flags.crypto)),
				title: "Publish crypto (crypto.json)",
			},
		]);
	}

	async #getFile(url: string): Promise<string> {
		const { data } = await http.get(url);

		return data;
	}
}
