import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { http } from "@mainsail/utils";
import { existsSync, writeFileSync } from "fs";
import { ensureDirSync, removeSync } from "fs-extra/esm";
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

	public configure(): void {
		this.definition
			.setFlag("app", "The link to the app.json file.", Joi.string().uri())
			.setFlag("peers", "The link to the peers.json file.", Joi.string().uri())
			.setFlag("crypto", "The link to the app.json file.", Joi.string().uri())
			.setFlag("reset", "Using the --reset flag will remove existing configuration.", Joi.boolean())
			.setFlag("overwrite", "Using the --overwrite will overwrite existing configuration.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		await this.#publish({ ...this.getFlags() });
	}

	async #publish(flags: Contracts.AnyObject): Promise<void> {
		if (!flags.overwrite && (!flags.app || !flags.crypto)) {
			throw new Error("You must provide the --app and --crypto flags to publish the configuration.");
		}

		this.app.rebind(Identifiers.ApplicationPaths).toConstantValue(this.environment.getPaths());

		const configDestination = this.app.getCorePath("config");

		await this.components.taskList([
			{
				task: () => {
					if (flags.reset) {
						removeSync(configDestination);
					}

					ensureDirSync(configDestination);
				},
				title: "Prepare directories",
			},
			{
				skip: () => {
					if (existsSync(`${configDestination}/.env`)) {
						return true;
					}

					return false;
				},
				task: () => {
					writeFileSync(`${configDestination}/.env`, ENV);
				},
				title: "Publish environment (.env)",
			},
			{
				skip: () => {
					if (existsSync(`${configDestination}/validators.json`)) {
						return true;
					}

					return false;
				},
				task: () => {
					writeFileSync(`${configDestination}/validators.json`, JSON.stringify(VALIDATORS, undefined, 4));
				},
				title: "Publish validators (validators.json)",
			},
			{
				skip: () => {
					if (!existsSync(`${configDestination}/peers.json`)) {
						return false;
					}

					if (flags.peers && flags.overwrite) {
						return false;
					}

					return true;
				},
				task: async () => {
					const peers = flags.peers ? await this.#getFile(flags.peers) : JSON.stringify(PEERS, undefined, 4);
					writeFileSync(`${configDestination}/peers.json`, peers);
				},
				title: "Publish peers (peers.json)",
			},
			{
				skip: () => {
					if (!flags.app) {
						return true;
					}

					if (existsSync(`${configDestination}/app.json`) && !flags.overwrite) {
						return true;
					}

					return false;
				},
				task: async () => {
					writeFileSync(join(configDestination, "app.json"), await this.#getFile(flags.app));
				},
				title: "Publish app (app.json)",
			},
			{
				skip: () => {
					if (!flags.crypto) {
						return true;
					}

					if (existsSync(`${configDestination}/crypto.json`) && !flags.overwrite) {
						return true;
					}

					return false;
				},
				task: async () => {
					writeFileSync(join(configDestination, "crypto.json"), await this.#getFile(flags.crypto));
				},
				title: "Publish crypto (crypto.json)",
			},
		]);
	}

	async #getFile(url: string): Promise<string> {
		const { data } = await http.get(url);

		return data;
	}
}
