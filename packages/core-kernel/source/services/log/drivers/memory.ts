import { inspect } from "util";
import { Kernel } from "@arkecosystem/core-contracts";
import { isEmpty, prettyTime } from "@arkecosystem/utils";
import chalk, { Chalk } from "chalk";
import dayjs, { Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import utc from "dayjs/plugin/utc";

import { injectable } from "../../../ioc";

dayjs.extend(advancedFormat);
dayjs.extend(utc);

@injectable()
export class MemoryLogger implements Kernel.Logger {
	private readonly levelStyles: Record<string, Chalk> = {
		alert: chalk.red,
		critical: chalk.red,
		debug: chalk.magenta,
		emergency: chalk.bgRed,
		error: chalk.red,
		info: chalk.blue,
		notice: chalk.green,
		warning: chalk.yellow,
	};

	private silentConsole = false;

	private lastTimestamp: Dayjs = dayjs().utc();

	public async make(options?: any): Promise<Kernel.Logger> {
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
