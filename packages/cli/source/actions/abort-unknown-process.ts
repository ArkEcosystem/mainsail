import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ProcessManager } from "../services/index.js";

@injectable()
export class AbortUnknownProcess {
	@inject(Identifiers.Cli.Service.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isUnknown(processName)) {
			throw new Error(`The "${processName}" process has entered an unknown state.`);
		}
	}
}
