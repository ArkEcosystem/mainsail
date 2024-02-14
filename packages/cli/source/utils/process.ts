import { inject, injectable } from "@mainsail/container";
import { Utils } from "@mainsail/kernel";
import { prettyBytes, prettyTime } from "@mainsail/utils";
import dayjs from "dayjs";
import Tail from "nodejs-tail";
import readLastLines from "read-last-lines";

import type { AbortMissingProcess, AbortStoppedProcess, AbortUnknownProcess } from "../actions";
import { Application } from "../application";
import { Clear, Spinner, Table } from "../components";
import { Process as IProcess, ProcessDescription } from "../contracts";
import { Identifiers } from "../ioc";
import type { ProcessManager } from "../services";

@injectable()
export class Process implements IProcess {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	#processName!: string;

	public initialize(processName: string): void {
		this.#processName = processName;
	}

	public stop(daemon: boolean): void {
		this.app.get<AbortMissingProcess>(Identifiers.AbortMissingProcess).execute(this.#processName);
		this.app.get<AbortUnknownProcess>(Identifiers.AbortUnknownProcess).execute(this.#processName);
		this.app.get<AbortStoppedProcess>(Identifiers.AbortStoppedProcess).execute(this.#processName);

		const spinner = this.app.get<Spinner>(Identifiers.Spinner).render(`Stopping ${this.#processName}`);

		spinner.start();

		this.processManager[daemon ? "delete" : "stop"](this.#processName);

		spinner.succeed();
	}

	public restart(): void {
		this.app.get<AbortMissingProcess>(Identifiers.AbortMissingProcess).execute(this.#processName);
		this.app.get<AbortStoppedProcess>(Identifiers.AbortStoppedProcess).execute(this.#processName);

		const spinner = this.app.get<Spinner>(Identifiers.Spinner).render(`Restarting ${this.#processName}`);

		spinner.start();

		this.processManager.restart(this.#processName);

		spinner.succeed();
	}

	public status(): void {
		this.app.get<AbortMissingProcess>(Identifiers.AbortMissingProcess).execute(this.#processName);

		this.app
			.get<Table>(Identifiers.Table)
			.render(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"], (table) => {
				const app: ProcessDescription | undefined = this.processManager.describe(this.#processName);

				Utils.assert.defined<ProcessDescription>(app);

				table.push([
					app.pid,
					app.name,
					app.pm2_env.version,
					app.pm2_env.status,
					prettyTime(dayjs().diff(app.pm2_env.pm_uptime)),
					`${app.monit.cpu}%`,
					prettyBytes(app.monit.memory),
				]);
			});
	}

	public async log(showErrors: boolean, lines: number): Promise<void> {
		this.app.get<AbortMissingProcess>(Identifiers.AbortMissingProcess).execute(this.#processName);

		const proc: Record<string, any> | undefined = this.processManager.describe(this.#processName);

		Utils.assert.defined<Record<string, any>>(proc);

		const file = showErrors ? proc.pm2_env.pm_err_log_path : proc.pm2_env.pm_out_log_path;

		this.app.get<Clear>(Identifiers.Clear).render();

		console.log(
			`Tailing last ${lines} lines for [${this.#processName}] process (change the value with --lines option)`,
		);

		console.log((await readLastLines.read(file, lines)).trim());

		const log = new Tail(file);

		log.on("line", console.log);

		log.watch();
	}
}
