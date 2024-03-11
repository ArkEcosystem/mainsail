import { inject, injectable } from "@mainsail/container";

import { Application } from "../application.js";
import { Spinner } from "../components/index.js";
import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";

@injectable()
export class RestartProcess {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		let spinner;
		try {
			spinner = this.app.get<Spinner>(Identifiers.Spinner).render(`Restarting ${processName}`);

			this.processManager.restart(processName);
		} catch (error) {
			throw new Error(error.stderr ? `${error.message}: ${error.stderr}` : error.message);
		} finally {
			spinner.stop();
		}
	}
}
