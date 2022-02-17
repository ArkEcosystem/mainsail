import nsfw, { ActionType, NSFW } from "nsfw";

import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";

@injectable()
export class Watcher {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	private watcher!: NSFW;

	public async boot(): Promise<void> {
		const configFiles: string[] = [".env", "delegates.json", "peers.json", "plugins.js", "plugins.json"];

		this.watcher = await nsfw(this.app.configPath(), (events) => {
			for (const event of events) {
				/* istanbul ignore else */
				if (event.action === ActionType.MODIFIED && configFiles.includes(event.file)) {
					this.app.reboot();
					break;
				}
			}
		});

		await this.watcher.start();
	}

	public async dispose(): Promise<void> {
		return this.watcher.stop();
	}
}
