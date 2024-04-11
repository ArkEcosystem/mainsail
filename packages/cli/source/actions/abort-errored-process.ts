import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";

@injectable()
export class AbortErroredProcess {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isErrored(processName)) {
			throw new Error(`The "${processName}" process has errored.`);
		}
	}
}
