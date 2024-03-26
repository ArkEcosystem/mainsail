import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import nsfw from "nsfw";

@injectable()
export class Watcher {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#watcher!: nsfw.NSFW;

	public async boot(): Promise<void> {
		const configFiles = new Set([".env", "validators.json", "peers.json", "plugins.js", "plugins.json"]);

		this.#watcher = await nsfw(this.app.configPath(), (events) => {
			for (const event of events) {
				if (event.action === nsfw.ActionType.MODIFIED && configFiles.has(event.file)) {
					this.app.reboot();
					break;
				}
			}
		});

		await this.#watcher.start();
	}

	public async dispose(): Promise<void> {
		return this.#watcher.stop();
	}
}
