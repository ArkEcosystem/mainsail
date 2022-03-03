import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";
import nsfw, { ActionType, NSFW } from "nsfw";

@injectable()
export class Watcher {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	private watcher!: NSFW;

	public async boot(): Promise<void> {
		const configFiles: string[] = [".env", "delegates.json", "peers.json", "plugins.js", "plugins.json"];

		this.watcher = await nsfw(this.app.configPath(), (events) => {
			for (const event of events) {
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
