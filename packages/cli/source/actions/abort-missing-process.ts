import { Identifiers, inject, injectable } from "../ioc";
import { ProcessManager } from "../services";

@injectable()
export class AbortMissingProcess {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.missing(processName)) {
			throw new Error(`The "${processName}" process does not exist.`);
		}
	}
}
