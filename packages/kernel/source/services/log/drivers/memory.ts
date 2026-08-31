import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { isEmpty, prettyTime } from "@mainsail/utils";
import chalk, { ChalkInstance } from "chalk";
import { inspect } from "util";

const pad = (value: number, length = 2): string => value.toString().padStart(length, "0");

// Local-time "yyyy-MM-dd HH:mm:ss.SSS" timestamp for log lines.
const formatTimestamp = (date: Date): string =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
	`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;

@injectable()
export class MemoryLogger implements Contracts.Kernel.Logger {
	protected readonly levelStyles: Record<string, ChalkInstance> = {
		alert: chalk.red,
		debug: chalk.magenta,
		error: chalk.red,
		info: chalk.blue,
		notice: chalk.green,
		warn: chalk.yellow,
	};

	protected silentConsole = false;

	#lastTimestamp: Date = new Date();

	public async make(options: unknown): Promise<Contracts.Kernel.Logger> {
		return this;
	}

	public alert(message: string): void {
		this.log("alert", message);
	}

	public error(message: string): void {
		this.log("error", message);
	}

	public warn(message: string): void {
		this.log("warn", message);
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

		level = level ? this.levelStyles[level](`[${level.toUpperCase()}] `) : "";

		const timestamp: string = formatTimestamp(new Date());
		const timestampDiff: string = this.getTimestampDiff();

		process.stdout.write(`[${timestamp}] ${level}${message}${timestampDiff}\n`);
	}

	protected getTimestampDiff(): string {
		const now = new Date();

		const diff: number = now.getTime() - this.#lastTimestamp.getTime();

		this.#lastTimestamp = new Date();

		return chalk.yellow(` +${diff ? prettyTime(diff) : "0ms"}`);
	}
}
