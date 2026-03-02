import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

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
} from "./actions/index.js";

@injectable()
export class ActionFactory {
	@inject(Identifiers.Cli.Application.Instance)
	protected readonly app!: Contracts.Cli.Application;

	public abortErroredProcess(processName: string): void {
		return this.app.get<AbortErroredProcess>(Identifiers.Cli.Action.AbortErroredProcess).execute(processName);
	}

	public abortMissingProcess(processName: string): void {
		return this.app.get<AbortMissingProcess>(Identifiers.Cli.Action.AbortMissingProcess).execute(processName);
	}

	public abortRunningProcess(processName: string): void {
		return this.app.get<AbortRunningProcess>(Identifiers.Cli.Action.AbortRunningProcess).execute(processName);
	}

	public abortStoppedProcess(processName: string): void {
		return this.app.get<AbortStoppedProcess>(Identifiers.Cli.Action.AbortStoppedProcess).execute(processName);
	}

	public abortUnknownProcess(processName: string): void {
		return this.app.get<AbortUnknownProcess>(Identifiers.Cli.Action.AbortUnknownProcess).execute(processName);
	}

	public async daemonizeProcess(options: Contracts.Cli.ProcessOptions, flags: Contracts.Cli.Flags): Promise<void> {
		return this.app.get<DaemonizeProcess>(Identifiers.Cli.Action.DaemonizeProcess).execute(options, flags);
	}

	public restartProcess(processName: string): void {
		return this.app.get<RestartProcess>(Identifiers.Cli.Action.RestartProcess).execute(processName);
	}

	public async restartRunningProcessWithPrompt(processName: string): Promise<void> {
		return this.app
			.get<RestartRunningProcessWithPrompt>(Identifiers.Cli.Action.RestartRunningProcessWithPrompt)
			.execute(processName);
	}

	public restartRunningProcess(processName: string): void {
		return this.app.get<RestartRunningProcess>(Identifiers.Cli.Action.RestartRunningProcess).execute(processName);
	}
}
