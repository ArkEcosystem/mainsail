import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import chalk, { Chalk } from "chalk";
import { error as console_error } from "console";
import pino, { PrettyOptions } from "pino";
import PinoPretty from "pino-pretty";
import pump from "pump";
import pumpify from "pumpify";
import { Transform } from "readable-stream";
import { createStream } from "rotating-file-stream";
import split from "split2";
import { PassThrough, Writable } from "stream";
import { inspect } from "util";

@injectable()
export class PinoLogger implements Contracts.Kernel.Logger {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

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

	#stream!: PassThrough;

	#combinedFileStream?: Writable;

	#logger!: pino.Logger;

	#silentConsole = false;

	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
		this.#stream = new PassThrough();
		this.#logger = pino(
			{
				base: null,
				// @ts-ignore
				customLevels: {
					alert: 1,
					critical: 2,
					debug: 7,
					emergency: 0,
					error: 3,
					info: 6,
					notice: 5,
					warning: 4,
				},
				formatters: {
					level(label, number) {
						return { level: label };
					},
				},
				level: "emergency",
				safe: true,
				useOnlyCustomLevels: true,
			},
			this.#stream,
		);

		if (this.#isValidLevel(options.levels.console)) {
			pump(
				this.#stream,
				split(),
				// @ts-ignore - Object literal may only specify known properties, and 'colorize' does not exist in type 'PrettyOptions'.
				this.#createPrettyTransport(options.levels.console, { colorize: true }),
				process.stdout,

				(error) => {
					console_error("Stdout stream closed due to an error:", error);
				},
			);
		}

		if (this.#isValidLevel(options.levels.file)) {
			this.#combinedFileStream = pumpify(
				split(),
				this.#createPrettyTransport(options.levels.file, { colorize: false }),
				this.#getFileStream(options.fileRotator),
			);

			this.#combinedFileStream.on("error", (error) => {
				console_error("File stream closed due to an error:", error);
			});

			this.#stream.pipe(this.#combinedFileStream);
		}

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

	public async dispose(): Promise<void> {
		if (this.#combinedFileStream) {
			this.#stream.unpipe(this.#combinedFileStream);

			if (!this.#combinedFileStream.destroyed) {
				this.#combinedFileStream.end();

				return new Promise<void>((resolve) => {
					this.#combinedFileStream.on("finish", () => {
						resolve();
					});
				});
			}
		}
	}

	#log(level: string, message: any): void {
		if (this.#silentConsole) {
			return;
		}

		if (Utils.isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		this.#logger[level](message);
	}

	#createPrettyTransport(level: string, prettyOptions?: PrettyOptions): Transform {
		const pinoPretty = PinoPretty({
			levelFirst: false,
			translateTime: "yyyy-mm-dd HH:MM:ss.l",
			...prettyOptions,
		});

		const getLevel = (level: string): number => this.#logger.levels.values[level];
		const formatLevel = (level: string): string => this.#levelStyles[level](level.toUpperCase());

		return new Transform({
			transform(chunk, enc, callback) {
				try {
					const json = JSON.parse(chunk);

					if (getLevel(json.level) <= getLevel(level)) {
						const line: string | undefined = pinoPretty(json);

						if (line !== undefined) {
							return callback(undefined, line.replace("USERLVL", formatLevel(json.level)));
						}
					}
				} catch {}

				return callback();
			},
		});
	}

	#getFileStream(options: { interval: string }): Writable {
		return createStream(
			(time: number | Date, index?: number): string => {
				if (!time) {
					return `${this.app.namespace()}-current.log`;
				}

				if (typeof time === "number") {
					time = new Date(time);
				}

				let filename: string = time.toISOString().slice(0, 10);

				if (index && index > 1) {
					filename += `.${index}`;
				}

				return `${this.app.namespace()}-${filename}.log.gz`;
			},
			{
				compress: "gzip",
				initialRotation: true,
				interval: options.interval,
				maxFiles: 10,
				maxSize: "100M",
				path: this.app.logPath(),
			},
		);
	}

	#isValidLevel(level: string): boolean {
		return ["emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"].includes(level);
	}
}
