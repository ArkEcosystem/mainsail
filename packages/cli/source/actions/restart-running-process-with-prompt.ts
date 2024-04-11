import { inject, injectable } from "@mainsail/container";

import { Application } from "../application.js";
import { Prompt } from "../components/index.js";
import { Identifiers } from "../ioc/index.js";
import { ProcessManager } from "../services/index.js";
import { RestartProcess } from "./restart-process.js";

@injectable()
export class RestartRunningProcessWithPrompt {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public async execute(processName: string): Promise<void> {
		if (this.processManager.isOnline(processName)) {
			const { confirm } = await this.app.get<Prompt>(Identifiers.Prompt).render({
				message: `Would you like to restart the ${processName} process?`,
				name: "confirm",
				type: "confirm",
			});

			if (confirm) {
				this.app.get<RestartProcess>(Identifiers.RestartProcess).execute(processName);
			}
		}
	}
}
