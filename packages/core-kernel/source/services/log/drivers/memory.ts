import { injectable } from "@mainsail/core-container";
import { Contracts } from "@mainsail/core-contracts";
import { isEmpty, prettyTime } from "@mainsail/utils";
import chalk, { Chalk } from "chalk";
import dayjs, { Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import utc from "dayjs/plugin/utc";
import { inspect } from "util";

dayjs.extend(advancedFormat);
dayjs.extend(utc);

@injectable()
export class MemoryLogger implements Contracts.Kernel.Logger {
	readonly #levelStyles: Record<string, Chalk> = {
		alert: chalk.red,
		critical: chalk.red,
		debug: chalk.magenta,
		emergency: chalk.bgRed,
		error: chalk.red,
		info: chalk.blue,
		notice: chalk.green,
		warning: chalk.yellow,
	};

	#silentConsole = false;

	#lastTimestamp: Dayjs = dayjs().utc();

	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
		return this;
	}

	public emergency(message: any): void {
		this.#log("emergency", message);
	}

	public alert(message: any): void {
		this.#log("alert", message);
	}

	public critical(message: any): void {
		this.#log("critical", message);
	}

	public error(message: any): void {
		this.#log("error", message);
	}

	public warning(message: any): void {
		this.#log("warning", message);
	}

	public notice(message: any): void {
		this.#log("notice", message);
	}

	public info(message: any): void {
		this.#log("info", message);
	}

	public debug(message: any): void {
		this.#log("debug", message);
	}

	public suppressConsoleOutput(suppress: boolean): void {
		this.#silentConsole = suppress;
	}

	public async dispose(): Promise<void> {}

	#log(level: any, message: any): void {
		if (this.#silentConsole) {
			return;
		}

		if (isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		level = level ? this.#levelStyles[level](`[${level.toUpperCase()}] `) : "";

		const timestamp: string = dayjs.utc().format("YYYY-MM-DD HH:MM:ss.SSS");
		const timestampDiff: string = this.#getTimestampDiff();

		process.stdout.write(`[${timestamp}] ${level}${message}${timestampDiff}\n`);
	}

	#getTimestampDiff(): string {
		const diff: number = dayjs().diff(this.#lastTimestamp);

		this.#lastTimestamp = dayjs.utc();

		return chalk.yellow(` +${diff ? prettyTime(diff) : "0ms"}`);
	}
}
