import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert, prettyBytes, prettyTime } from "@mainsail/utils";
import dayjs from "dayjs";
import Tail from "nodejs-tail";
import readLastLines from "read-last-lines";

import type { AbortMissingProcess, AbortStoppedProcess, AbortUnknownProcess } from "../actions/index.js";
import { Application } from "../application.js";
import { Clear, Spinner, Table } from "../components/index.js";
import type { ProcessManager } from "../services/index.js";

@injectable()
export class Process implements Contracts.Cli.Process {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.Cli.Service.ProcessManager)
	private readonly processManager!: ProcessManager;

	#processName!: string;

	public initialize(processName: string): void {
		this.#processName = processName;
	}

	public stop(daemon: boolean): void {
		this.app.get<AbortMissingProcess>(Identifiers.Cli.Action.AbortMissingProcess).execute(this.#processName);
		this.app.get<AbortUnknownProcess>(Identifiers.Cli.Action.AbortUnknownProcess).execute(this.#processName);
		this.app.get<AbortStoppedProcess>(Identifiers.Cli.Action.AbortStoppedProcess).execute(this.#processName);

		const spinner = this.app
			.get<Spinner>(Identifiers.Cli.Component.Spinner)
			.render(`Stopping ${this.#processName}`);
		spinner.start();

		this.processManager[daemon ? "delete" : "stop"](this.#processName);

		spinner.succeed();
	}

	public restart(): void {
		this.app.get<AbortMissingProcess>(Identifiers.Cli.Action.AbortMissingProcess).execute(this.#processName);
		this.app.get<AbortStoppedProcess>(Identifiers.Cli.Action.AbortStoppedProcess).execute(this.#processName);

		const spinner = this.app
			.get<Spinner>(Identifiers.Cli.Component.Spinner)
			.render(`Restarting ${this.#processName}`);

		spinner.start();

		this.processManager.restart(this.#processName);

		spinner.succeed();
	}

	public status(): void {
		this.app.get<AbortMissingProcess>(Identifiers.Cli.Action.AbortMissingProcess).execute(this.#processName);

		this.app
			.get<Table>(Identifiers.Cli.Component.Table)
			.render(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"], (table) => {
				const app: Contracts.Cli.ProcessDescription | undefined = this.processManager.describe(this.#processName);

				assert.defined(app);

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
		this.app.get<AbortMissingProcess>(Identifiers.Cli.Action.AbortMissingProcess).execute(this.#processName);

		const proc = this.processManager.describe(this.#processName);

		assert.defined(proc);

		const file = showErrors ? proc.pm2_env.pm_err_log_path : proc.pm2_env.pm_out_log_path;

		this.app.get<Clear>(Identifiers.Cli.Component.Clear).render();

		console.log(
			`Tailing last ${lines} lines for [${this.#processName}] process (change the value with --lines option)`,
		);

		console.log((await readLastLines.read(file, lines)).trim());

		const log = new Tail(file);

		log.on("line", console.log);

		log.watch();
	}
}
