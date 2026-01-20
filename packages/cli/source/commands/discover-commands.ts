import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { lstatSync, readdirSync } from "fs";

import { Command } from "./command.js";

@injectable()
export class DiscoverCommands implements Contracts.Cli.DiscoverCommands {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Contracts.Cli.Application;

	public async within(path: string): Promise<Contracts.Cli.CommandList> {
		const commandFiles: string[] = readdirSync(path)
			.map((item: string) => `${path}/${item}`)
			.filter((item: string) => lstatSync(item).isFile())
			.filter((item: string) => item.endsWith(".js"));

		const commands: Contracts.Cli.CommandList = {};

		for (const file of commandFiles) {
			const { Command } = await import(file);
			const commandInstance: Command = this.app.resolve(Command);

			if (!commandInstance.isHidden) {
				commands[commandInstance.signature] = commandInstance;
			}
		}

		return commands;
	}

	public async from(packages: string[]): Promise<Contracts.Cli.CommandList> {
		const commands: Contracts.Cli.CommandList = {};

		if (!Array.isArray(packages) || packages.length <= 0) {
			return commands;
		}

		for (const package_ of packages) {
			try {
				const { Commands } = await import(package_);
				for (const CMD of Commands) {
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
