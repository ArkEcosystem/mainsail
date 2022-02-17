import { Identifiers, inject, injectable } from "../ioc";
import { ProcessManager } from "../services";

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
