import { Application } from "../application";
import { Prompt } from "../components";
import { Identifiers, inject, injectable } from "../ioc";
import { ProcessManager } from "../services";
import { RestartProcess } from "./restart-process";

@injectable()
export class RestartRunningProcessWithPrompt {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public async execute(processName: string): Promise<void> {
		if (this.processManager.isOnline(processName)) {
			const { confirm } = await this.app.get<Prompt>(Identifiers.Prompt).render([
				{
					message: `Would you like to restart the ${processName} process?`,
					name: "confirm",
					type: "confirm",
				},
			]);

			if (confirm) {
				this.app.get<RestartProcess>(Identifiers.RestartProcess).execute(processName);
			}
		}
	}
}
