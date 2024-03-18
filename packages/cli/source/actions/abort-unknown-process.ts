import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";

@injectable()
export class AbortUnknownProcess {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isUnknown(processName)) {
			throw new Error(`The "${processName}" process has entered an unknown state.`);
		}
	}
}
