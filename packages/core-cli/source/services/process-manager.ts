import { execa, ExecaSyncReturnValue, ExecaReturnValue } from "../execa";

import { ProcessDescription, ProcessIdentifier, ProcessState } from "../contracts";
import { injectable } from "../ioc";
import { Flags } from "../utils";

@injectable()
export class ProcessManager {
	public list(): ProcessDescription[] {
		try {
			const { stdout } = this.#shellSync("pm2 jlist");

			if (!stdout) {
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

	public describe(id: ProcessIdentifier): ProcessDescription | undefined {
		const processes: ProcessDescription[] | undefined = this.list();

		if (processes.length <= 0) {
			return undefined;
		}

		return processes.find((process: ProcessDescription) => [process.id, process.name].includes(id));
	}

	public start(opts: Record<string, any>, flags: Record<string, any>): ExecaSyncReturnValue {
		let command = `pm2 start ${opts.script}`;

		if (opts.node_args) {
			command += ` --node-args="${Flags.castFlagsToString(opts.node_args)}"`;
		}

		if (flags !== undefined && Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		if (opts.args) {
			command += ` -- ${opts.args}`;
		}

		return this.#shellSync(command);
	}

	public stop(id: ProcessIdentifier, flags: Record<string, any> = {}): ExecaSyncReturnValue {
		let command = `pm2 stop ${id}`;

		if (Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		return this.#shellSync(command);
	}

	public restart(id: ProcessIdentifier, flags: Record<string, any> = { "update-env": true }): ExecaSyncReturnValue {
		let command = `pm2 restart ${id}`;

		if (Object.keys(flags).length > 0) {
			command += ` ${Flags.castFlagsToString(flags)}`;
		}

		return this.#shellSync(command);
	}

	public reload(id: ProcessIdentifier): ExecaSyncReturnValue {
		return this.#shellSync(`pm2 reload ${id}`);
	}

	public reset(id: ProcessIdentifier): ExecaSyncReturnValue {
		return this.#shellSync(`pm2 reset ${id}`);
	}

	public delete(id: ProcessIdentifier): ExecaSyncReturnValue {
		return this.#shellSync(`pm2 delete ${id}`);
	}

	public flush(): ExecaSyncReturnValue {
		return this.#shellSync("pm2 flush");
	}

	public reloadLogs(): ExecaSyncReturnValue {
		return this.#shellSync("pm2 reloadLogs");
	}

	public ping(): ExecaSyncReturnValue {
		return this.#shellSync("pm2 ping");
	}

	public update(): ExecaSyncReturnValue {
		return this.#shellSync("pm2 update");
	}

	public async trigger(id: ProcessIdentifier, processActionName: string, param?: string): Promise<ExecaReturnValue> {
		return this.#shell(`pm2 trigger ${id} ${processActionName} ${param}`);
	}

	public status(id: ProcessIdentifier): ProcessState | undefined {
		const process: ProcessDescription | undefined = this.describe(id);

		return process ? process.pm2_env.status : undefined;
	}

	public isOnline(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Online;
	}

	public isStopped(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Stopped;
	}

	public isStopping(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Stopping;
	}

	public isWaiting(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Waiting;
	}

	public isLaunching(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Launching;
	}

	public isErrored(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.Errored;
	}

	public isOneLaunch(id: ProcessIdentifier): boolean {
		return this.status(id) === ProcessState.OneLaunch;
	}

	public isUnknown(id: ProcessIdentifier): boolean {
		const processState: ProcessState | undefined = this.status(id);

		if (processState === undefined) {
			return true;
		}

		return !Object.values(ProcessState).includes(processState);
	}

	public has(id: ProcessIdentifier): boolean {
		try {
			const { stdout } = this.#shellSync(`pm2 id ${id} | awk '{ print $2 }'`);

			return !!stdout && !isNaN(Number(stdout));
		} catch {
			return false;
		}
	}

	public missing(id: ProcessIdentifier): boolean {
		return !this.has(id);
	}

	async #shell(command: string): Promise<ExecaReturnValue> {
		return execa.run(command, { shell: true });
	}

	#shellSync(command: string): ExecaSyncReturnValue {
		return execa.sync(command, { shell: true });
	}
}
