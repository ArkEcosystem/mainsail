import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { inspect } from "util";
import winston from "winston";

@injectable()
export class Logger implements Contracts.Kernel.Logger {
	#logger: winston.Logger;

	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
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

	public emergency(message: any): void {
		this.log("error", message);
	}

	public alert(message: any): void {
		this.log("error", message);
	}

	public critical(message: any): void {
		this.log("error", message);
	}

	public error(message: any): void {
		this.log("error", message);
	}

	public warning(message: any): void {
		this.log("warn", message);
	}

	public notice(message: any): void {
		this.log("info", message);
	}

	public info(message: any): void {
		this.log("info", message);
	}

	public debug(message: any): void {
		this.log("debug", message);
	}

	public suppressConsoleOutput(suppress: boolean): void {
		//
	}

	public async dispose(): Promise<void> {
		//
	}

	private log(level: string, message: any): void {
		if (Utils.isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		this.#logger[level](message);
	}
}
