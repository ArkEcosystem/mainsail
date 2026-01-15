import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ProcessManager } from "../services/index.js";

@injectable()
export class AbortRunningProcess {
	@inject(Identifiers.Cli.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isOnline(processName)) {
			throw new Error(`The "${processName}" process is already running.`);
		}
	}
}
