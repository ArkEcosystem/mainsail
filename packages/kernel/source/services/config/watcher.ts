import { Contracts } from "@mainsail/contracts";
import nsfw, { ActionType, NSFW } from "nsfw";

@injectable()
export class Watcher {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	#watcher!: NSFW;

	public async boot(): Promise<void> {
		const configFiles = new Set([".env", "validators.json", "peers.json", "plugins.js", "plugins.json"]);

		this.#watcher = await nsfw(this.app.configPath(), (events) => {
			for (const event of events) {
				if (event.action === ActionType.MODIFIED && configFiles.has(event.file)) {
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
