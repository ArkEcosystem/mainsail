import { inject, injectable } from "@mainsail/container";

import { Application } from "../application.js";
import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";
import { RestartProcess } from "./restart-process.js";

@injectable()
export class RestartRunningProcess {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isOnline(processName)) {
			this.app.get<RestartProcess>(Identifiers.RestartProcess).execute(processName);
		}
	}
}
