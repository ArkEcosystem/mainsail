import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Application } from "../application.js";
import { Spinner } from "../components/index.js";
import { ProcessManager } from "../services/index.js";

@injectable()
export class RestartProcess {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.Cli.Service.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		let spinner;
		try {
			spinner = this.app.get<Spinner>(Identifiers.Cli.Component.Spinner).render(`Restarting ${processName}`);

			this.processManager.restart(processName);
		} catch (rawError) {
			const error = ensureError(rawError);
			const stderr = (rawError as { stderr?: string }).stderr;
			throw new Error(stderr ? `${error.message}: ${stderr}` : error.message);
		} finally {
			spinner.stop();
		}
	}
}
