import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Output } from "../output/index.js";

@injectable()
export class Logger implements Contracts.Cli.Logger {
	@inject(Identifiers.Cli.Output.Instance)
	private readonly output!: Output;

	public alert(message: string | Error): void {
		this.log(message, "error");
	}

	public error(message: string | Error): void {
		this.log(message, "error");
	}

	public warn(message: string | Error): void {
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

	public log(message: string | Error, method: "log" | "info" | "debug" | "warn" | "error" = "log"): void {
		if (this.output.isQuiet()) {
			return;
		}

		console[method](message);
	}
}
