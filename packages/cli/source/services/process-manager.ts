import { Enums } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { execa, Result, SyncResult } from "../execa.js";
import { Flags } from "../utils/flags.js";

@injectable()
export class ProcessManager implements Contracts.Cli.ProcessManager {
	public list(): Contracts.Cli.ProcessDescription[] {
		try {
			const { stdout } = this.#shellSync("pm2 jlist");

			if (!stdout) {
				return [];
			}

			if (typeof stdout !== "string") {
				return [];
			}

			const lastLine: string | undefined = stdout.split("\n").pop();

			if (!lastLine) {
				return [];
			}

			return Object.values(JSON.parse(lastLine));
		} catch {
			return [];
		}
	}

	public describe(id: Contracts.Cli.ProcessIdentifier): Contracts.Cli.ProcessDescription | undefined {
		const processes: Contracts.Cli.ProcessDescription[] | undefined = this.list();

		if (processes.length <= 0) {
			return undefined;
		}

		return processes.find((process: Contracts.Cli.ProcessDescription) => [process.pid, process.name].includes(id));
	}

	public start(options: Contracts.Types.JsonObject, flags: Contracts.Cli.AnyObject): SyncResult {
		let command = `pm2 start ${options.script}`;

		if (options.node_args) {
			command += ` --node-args="${Flags.castFlagsToString(options.node_args as unknown as Contracts.Cli.AnyObject)}"`;
		}

		if (flags !== undefined && Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		if (options.args) {
			command += ` -- ${options.args}`;
		}

		return this.#shellSync(command);
	}

	public stop(id: Contracts.Cli.ProcessIdentifier, flags: Contracts.Cli.AnyObject = {}): SyncResult {
		let command = `pm2 stop ${id}`;

		if (Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		return this.#shellSync(command);
	}

	public restart(
		id: Contracts.Cli.ProcessIdentifier,
		flags: Contracts.Cli.AnyObject = { "update-env": true },
	): SyncResult {
		let command = `pm2 restart ${id}`;

		if (Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		return this.#shellSync(command);
	}

	public reload(id: Contracts.Cli.ProcessIdentifier): SyncResult {
		return this.#shellSync(`pm2 reload ${id}`);
	}

	public reset(id: Contracts.Cli.ProcessIdentifier): SyncResult {
		return this.#shellSync(`pm2 reset ${id}`);
	}

	public delete(id: Contracts.Cli.ProcessIdentifier): SyncResult {
		return this.#shellSync(`pm2 delete ${id}`);
	}

	public flush(): SyncResult {
		return this.#shellSync("pm2 flush");
	}

	public reloadLogs(): SyncResult {
		return this.#shellSync("pm2 reloadLogs");
	}

	public ping(): SyncResult {
		return this.#shellSync("pm2 ping");
	}

	public update(): SyncResult {
		return this.#shellSync("pm2 update");
	}

	public async trigger(
		id: Contracts.Cli.ProcessIdentifier,
		processActionName: string,
		parameter?: string,
	): Promise<Result> {
		return this.#shell(`pm2 trigger ${id} ${processActionName} ${parameter}`);
	}

	public status(id: Contracts.Cli.ProcessIdentifier): Contracts.Cli.ProcessState | undefined {
		const process: Contracts.Cli.ProcessDescription | undefined = this.describe(id);

		return process ? process.pm2_env.status : undefined;
	}

	public isOnline(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Online;
	}

	public isStopped(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Stopped;
	}

	public isStopping(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Stopping;
	}

	public isWaiting(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Waiting;
	}

	public isLaunching(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Launching;
	}

	public isErrored(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.Errored;
	}

	public isOneLaunch(id: Contracts.Cli.ProcessIdentifier): boolean {
		return this.status(id) === Enums.Cli.ProcessState.OneLaunch;
	}

	public isUnknown(id: Contracts.Cli.ProcessIdentifier): boolean {
		const processState: Contracts.Cli.ProcessState | undefined = this.status(id);

		if (processState === undefined) {
			return true;
		}

		return !Object.values(Enums.Cli.ProcessState).includes(processState);
	}

	public has(id: Contracts.Cli.ProcessIdentifier): boolean {
		try {
			const { stdout } = this.#shellSync(`pm2 id ${id} | awk '{ print $2 }'`);

			return !!stdout && !Number.isNaN(Number(stdout));
		} catch {
			return false;
		}
	}

	public missing(id: Contracts.Cli.ProcessIdentifier): boolean {
		return !this.has(id);
	}

	async #shell(command: string): Promise<Result> {
		return execa.run(command, { shell: true });
	}

	#shellSync(command: string): SyncResult {
		return execa.sync(command, { shell: true });
	}
}
