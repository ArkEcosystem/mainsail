import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import { Output } from "../output/index.js";

@injectable()
export class Logger {
	@inject(Identifiers.Output)
	private readonly output!: Output;

	public emergency(message: string | Error): void {
		this.log(message, "error");
	}

	public alert(message: string | Error): void {
		this.log(message, "error");
	}

	public critical(message: string | Error): void {
		this.log(message, "error");
	}

	public error(message: string | Error): void {
		this.log(message, "error");
	}

	public warning(message: string | Error): void {
		this.log(message, "warn");
	}

	public notice(message: string | Error): void {
		this.log(message, "info");
	}

	public info(message: string | Error): void {
		this.log(message, "info");
	}

	public debug(message: string | Error): void {
		this.log(message, "debug");
	}

	public log(message: string | Error, method = "log"): void {
		if (this.output.isQuiet()) {
			return;
		}

		console[method](message);
	}
}
