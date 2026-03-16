import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import nsfw from "nsfw";

@injectable()
export class Watcher {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#watcher!: nsfw.NSFW;
	#configFiles = new Set([".env", "validators.json", "peers.json", "plugins.js", "plugins.json"]);

	public async boot(): Promise<void> {
		this.#watcher = await nsfw(this.app.configPath(), (events) => {
			void this.#handleEvents(events);
		});

		await this.#watcher.start();
	}

	async #handleEvents(events: nsfw.FileChangeEvent[]) {
		for (const event of events) {
			if (event.action === nsfw.ActionType.MODIFIED && this.#configFiles.has(event.file)) {
				await this.app.reboot();
				break;
			}
		}
	}

	public async dispose(): Promise<void> {
		return this.#watcher.stop();
	}
}
