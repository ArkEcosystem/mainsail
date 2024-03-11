import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";

@injectable()
export class AbortStoppedProcess {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isStopped(processName)) {
			throw new Error(`The "${processName}" process is not running.`);
		}
	}
}
