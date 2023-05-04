import { Identifiers, inject, injectable } from "../ioc";
import { ProcessManager } from "../services";

@injectable()
export class AbortUnknownProcess {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	public execute(processName: string): void {
		if (this.processManager.isUnknown(processName)) {
			throw new Error(`The "${processName}" process has entered an unknown state.`);
		}
	}
}
