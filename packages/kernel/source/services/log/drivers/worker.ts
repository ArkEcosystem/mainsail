import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { isEmpty } from "@mainsail/utils";
import { inspect } from "util";

@injectable()
export class WorkerLogger implements Contracts.Kernel.Logger {
	#levels = new Set(["emergency", "alert", "fatal", "error", "warning", "notice", "info", "debug"]);

	protected silentConsole = false;

	public async make(options: unknown): Promise<Contracts.Kernel.Logger> {
		return this;
	}

	public emergency(message: string): void {
		this.log("emergency", message);
	}

	public alert(message: string): void {
		this.log("alert", message);
	}

	public fatal(message: string): void {
		this.log("fatal", message);
	}

	public error(message: string): void {
		this.log("error", message);
	}

	public warning(message: string): void {
		this.log("warning", message);
	}

	public notice(message: string): void {
		this.log("notice", message);
	}

	public info(message: string): void {
		this.log("info", message);
	}

	public debug(message: string): void {
		this.log("debug", message);
	}

	public isValidLevel(level: string): boolean {
		return this.#levels.has(level);
	}

	public suppressConsoleOutput(suppress: boolean): void {
		this.silentConsole = suppress;
	}

	public async dispose(): Promise<void> {}

	protected log(level: string, message: string): void {
		if (this.silentConsole) {
			return;
		}

		if (isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		process.stdout.write(`[${level}] ${message}\n`);
	}
}
