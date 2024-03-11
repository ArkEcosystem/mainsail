import { inject, injectable } from "@mainsail/container";
import { lstatSync, readdirSync } from "fs";

import { Application, CommandList } from "../contracts.js";
import { Identifiers } from "../ioc/index.js";
import { Command } from "./command.js";

@injectable()
export class DiscoverCommands {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	public within(path: string): CommandList {
		const commandFiles: string[] = readdirSync(path)
			.map((item: string) => `${path}/${item}`)
			.filter((item: string) => lstatSync(item).isFile())
			.filter((item: string) => item.endsWith(".js"));

		const commands: CommandList = {};

		for (const file of commandFiles) {
			const commandInstance: Command = this.app.resolve(require(file).Command);

			if (!commandInstance.isHidden) {
				commands[commandInstance.signature] = commandInstance;
			}
		}

		return commands;
	}

	public from(packages: string[]): CommandList {
		const commands: CommandList = {};

		if (!Array.isArray(packages) || packages.length <= 0) {
			return commands;
		}

		for (const package_ of packages) {
			try {
				for (const CMD of require(package_).Commands) {
					const commandInstance: Command = this.app.resolve(CMD);

					if (!commandInstance.isHidden) {
						commands[commandInstance.signature] = commandInstance;
					}
				}
			} catch {}
		}

		return commands;
	}
}
