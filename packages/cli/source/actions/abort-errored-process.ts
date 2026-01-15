import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { ProcessManager } from "../services/index.js";

@injectable()
export class AbortErroredProcess {
	@inject(Identifiers.Cli.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isErrored(processName)) {
			throw new Error(`The "${processName}" process has errored.`);
		}
	}
}
