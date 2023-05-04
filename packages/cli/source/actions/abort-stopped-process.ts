import { Identifiers, inject, injectable } from "../ioc";
import { ProcessManager } from "../services";

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
