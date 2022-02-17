import {
	AbortErroredProcess,
	AbortMissingProcess,
	AbortRunningProcess,
	AbortStoppedProcess,
	AbortUnknownProcess,
	DaemonizeProcess,
	RestartProcess,
	RestartRunningProcess,
	RestartRunningProcessWithPrompt,
} from "./actions";
import { Application, ProcessOptions } from "./contracts";
import { Identifiers, inject, injectable } from "./ioc";

@injectable()
export class ActionFactory {
	@inject(Identifiers.Application)
	protected readonly app!: Application;

	public abortErroredProcess(processName: string): void {
		return this.app.get<AbortErroredProcess>(Identifiers.AbortErroredProcess).execute(processName);
	}

	public abortMissingProcess(processName: string): void {
		return this.app.get<AbortMissingProcess>(Identifiers.AbortMissingProcess).execute(processName);
	}

	public abortRunningProcess(processName: string): void {
		return this.app.get<AbortRunningProcess>(Identifiers.AbortRunningProcess).execute(processName);
	}

	public abortStoppedProcess(processName: string): void {
		return this.app.get<AbortStoppedProcess>(Identifiers.AbortStoppedProcess).execute(processName);
	}

	public abortUnknownProcess(processName: string): void {
		return this.app.get<AbortUnknownProcess>(Identifiers.AbortUnknownProcess).execute(processName);
	}

	public async daemonizeProcess(options: ProcessOptions, flags): Promise<void> {
		return this.app.get<DaemonizeProcess>(Identifiers.DaemonizeProcess).execute(options, flags);
	}

	public restartProcess(processName: string): void {
		return this.app.get<RestartProcess>(Identifiers.RestartProcess).execute(processName);
	}

	public async restartRunningProcessWithPrompt(processName: string): Promise<void> {
		return this.app
			.get<RestartRunningProcessWithPrompt>(Identifiers.RestartRunningProcessWithPrompt)
			.execute(processName);
	}

	public restartRunningProcess(processName: string): void {
		return this.app.get<RestartRunningProcess>(Identifiers.RestartRunningProcess).execute(processName);
	}
}
