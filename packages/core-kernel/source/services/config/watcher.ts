import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import nsfw, { ActionType, NSFW } from "nsfw";

@injectable()
export class Watcher {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	private watcher!: NSFW;

	public async boot(): Promise<void> {
		const configFiles: string[] = [".env", "validators.json", "peers.json", "plugins.js", "plugins.json"];

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
