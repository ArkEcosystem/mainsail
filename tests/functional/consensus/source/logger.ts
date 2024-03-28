import { Services } from "@mainsail/kernel";
import { isEmpty } from "@mainsail/utils";
import { format } from "date-fns";
import { inspect } from "util";

type Options = {
	id: number;
};

export class TestLogger extends Services.Log.MemoryLogger {
	#options!: Options;

	public async make(options: Options): Promise<TestLogger> {
		this.#options = options;

		return this;
	}

	protected log(level: string, message: string): void {
		if (isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		level = level ? this.levelStyles[level](`(${this.#options.id})[${level.toUpperCase()}] `) : "";

		const timestamp: string = format(new Date(), "yyyy-MM-dd HH:MM:ss.SSS");
		const timestampDiff: string = this.getTimestampDiff();

		process.stdout.write(`[${timestamp}]${level}${message}${timestampDiff}\n`);
	}
}
