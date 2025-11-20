import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { isEmpty } from "@mainsail/utils";
import { inspect } from "util";
import winston from "winston";

@injectable()
export class Logger implements Contracts.Kernel.Logger {
	#logger!: winston.Logger;

	public async make(options: {
		levels: { console: Contracts.Kernel.LoggerContext; file: Contracts.Kernel.LoggerContext };
	}): Promise<Contracts.Kernel.Logger> {
		this.#logger = winston.createLogger({
			format: winston.format.json(),
			level: options.levels.console,
			transports: [
				new winston.transports.Console({
					format: winston.format.simple(),
				}),
				new winston.transports.File({ filename: "combined.log", level: options.levels.file }),
			],
		});

		return this;
	}

	public alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("error", message);
	}

	public error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("error", message);
	}

	public warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("warn", message);
	}

	public notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("info", message);
	}

	public info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("info", message);
	}

	public debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("debug", message);
	}

	public suppressConsoleOutput(suppress: boolean): void {
		//
	}

	public async dispose(): Promise<void> {
		//
	}

	#log(level: string, message: any): void {
		if (isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		this.#logger[level](message);
	}
}
