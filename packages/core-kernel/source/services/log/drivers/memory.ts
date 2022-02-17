import { isEmpty, prettyTime } from "@arkecosystem/utils";
import chalk, { Chalk } from "chalk";
import dayjs, { Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import utc from "dayjs/plugin/utc";
import { inspect } from "util";

import { Logger } from "../../../contracts/kernel/log";
import { injectable } from "../../../ioc";

dayjs.extend(advancedFormat);
dayjs.extend(utc);

@injectable()
export class MemoryLogger implements Logger {
	private readonly levelStyles: Record<string, Chalk> = {
		emergency: chalk.bgRed,
		alert: chalk.red,
		critical: chalk.red,
		error: chalk.red,
		warning: chalk.yellow,
		notice: chalk.green,
		info: chalk.blue,
		debug: chalk.magenta,
	};

	private silentConsole: boolean = false;

	private lastTimestamp: Dayjs = dayjs().utc();

	public async make(options?: any): Promise<Logger> {
		return this;
	}

	public emergency(message: any): void {
		this.log("emergency", message);
	}

	public alert(message: any): void {
		this.log("alert", message);
	}

	public critical(message: any): void {
		this.log("critical", message);
	}

	public error(message: any): void {
		this.log("error", message);
	}

	public warning(message: any): void {
		this.log("warning", message);
	}

	public notice(message: any): void {
		this.log("notice", message);
	}

	public info(message: any): void {
		this.log("info", message);
	}

	public debug(message: any): void {
		this.log("debug", message);
	}

	public suppressConsoleOutput(suppress: boolean): void {
		this.silentConsole = suppress;
	}

	public async dispose(): Promise<void> {}

	private log(level: any, message: any): void {
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

		const timestamp: string = dayjs.utc().format("YYYY-MM-DD HH:MM:ss.SSS");
		const timestampDiff: string = this.getTimestampDiff();

		process.stdout.write(`[${timestamp}] ${level}${message}${timestampDiff}\n`);
	}

	private getTimestampDiff(): string {
		const diff: number = dayjs().diff(this.lastTimestamp);

		this.lastTimestamp = dayjs.utc();

		return chalk.yellow(` +${diff ? prettyTime(diff) : "0ms"}`);
	}
}
