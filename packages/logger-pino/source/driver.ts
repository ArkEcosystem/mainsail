import { Identifiers, LogLevels } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { assert, isEmpty } from "@mainsail/utils";
import chalk, { ChalkInstance } from "chalk";
import type { Color, Colorette } from "colorette";
import { error as console_error } from "console";
import pino, { LogDescriptor } from "pino";
import { prettyFactory, PrettyOptions } from "pino-pretty";
import pump from "pump";
import pumpify from "pumpify";
import { Transform } from "readable-stream";
import { createStream } from "rotating-file-stream";
import split from "split2";
import { PassThrough, Writable } from "stream";
import { inspect } from "util";

type ColoretteColorNames = keyof Pick<
	Colorette,
	{
		[K in keyof Colorette]: Colorette[K] extends Color ? K : never;
	}[keyof Colorette]
>;

@injectable()
export class PinoLogger implements Contracts.Kernel.Logger {
	static LOG_LEVELS: Set<string> = new Set(LogLevels);

	static MAX_LEVEL_LENGTH = Math.max(...LogLevels.map((level) => level.length));

	static LOG_CONTEXTS: Contracts.Kernel.LoggerContext[] = ["system", "evm", "consensus", "p2p", "tx-pool", "api"];

	static MAX_CONTEXT_LENGTH = Math.max(...PinoLogger.LOG_CONTEXTS.map((context) => context.length));

	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	readonly #levelStyles: Record<string, ChalkInstance> = {
		alert: chalk.red,
		debug: chalk.magenta,
		error: chalk.red,
		info: chalk.blue,
		notice: chalk.green,
		warn: chalk.yellow,
	};

	readonly #contextStyles: Record<string, ColoretteColorNames> = {
		// consensus: "reset",
		// evm: "reset",
		// p2p: "dim",
		// system: "reset",
	};

	#stream!: PassThrough;

	#combinedFileStream?: Writable;

	#logger!: pino.Logger<"alert" | "debug" | "error" | "info" | "notice" | "warn">;

	#silentConsole = false;

	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
		this.#stream = new PassThrough();

		this.#logger = pino(
			{
				base: null,
				customLevels: {
					alert: 0,
					debug: 5,
					error: 1,
					info: 4,
					notice: 3,
					warn: 2,
				},
				formatters: {
					level(label, number) {
						return { level: label, pid: process.pid };
					},
				},
				level: "alert",
				safe: true,
				useOnlyCustomLevels: true,
			},
			this.#stream,
		);

		if (this.#isValidLevel(options.levels.console)) {
			pump(
				this.#stream,
				split(),
				this.#createPrettyTransport(options.levels.console, { colorize: true }),
				process.stdout,

				(error) => {
					console_error("Stdout stream closed due to an error:", error);
				},
			);
		}

		if (this.#isValidLevel(options.levels.file)) {
			this.#combinedFileStream = new pumpify(
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

	public alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("alert", message, context);
	}

	public error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("error", message, context);
	}

	public warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("warn", message, context);
	}

	public notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("notice", message, context);
	}

	public info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("info", message, context);
	}

	public debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.#log("debug", message, context);
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
					assert.defined(this.#combinedFileStream);
					this.#combinedFileStream.on("finish", () => {
						resolve();
					});
				});
			}
		}
	}

	#log(level: string, message: string, context: Contracts.Kernel.LoggerContext = "system"): void {
		if (this.#silentConsole) {
			return;
		}

		if (isEmpty(message)) {
			return;
		}

		if (typeof message !== "string") {
			message = inspect(message, { depth: 1 });
		}

		if (this.#logger === undefined) {
			return;
		}

		if (this.#logger.child === undefined) {
			// console.log(" NOT A CHILD", this.app.thread());
			// console.log(this.#logger);
			return;
		} else {
			// console.log(" IS A CHILD");
			// console.log(this.#logger);
		}

		const logger = this.#logger.child({ context });

		logger[level](message);
	}

	#messageFormat(
		log: LogDescriptor,
		messageKey: string,
		levelLabel: string,
		{ colors }: { colors: Colorette },
	): string {
		const levelPadding = PinoLogger.MAX_LEVEL_LENGTH - log.level.length;
		// const contextPadding = PinoLogger.MAX_CONTEXT_LENGTH - log.context.length;

		let message = "";
		message += `${" ".repeat(levelPadding)}`;
		// message += `[${log.context.toUpperCase()}${".".repeat(contextPadding)}]`;
		message += `[${log.context.toUpperCase().replace("-", "").slice(0, 3)}]`;
		message += ` ${log[messageKey]}`;

		if (this.#contextStyles[log.context]) {
			const colorName = this.#contextStyles[log.context];
			return `${colors[colorName](message)}`;
		}

		return message;
	}

	#createPrettyTransport(level: string, prettyOptions?: PrettyOptions): Transform {
		const pinoPretty = prettyFactory({
			ignore: "pid,context",
			levelFirst: false,
			messageFormat: this.#messageFormat.bind(this),
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
					return `${this.app.name()}-current.log`;
				}

				if (typeof time === "number") {
					time = new Date(time);
				}

				let filename: string = time.toISOString().slice(0, 10);

				if (index && index > 1) {
					filename += `.${index}`;
				}

				return `${this.app.name()}-${filename}.log.gz`;
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

	#isValidLevel(level: Contracts.Kernel.LoggerContext): boolean {
		return PinoLogger.LOG_LEVELS.has(level);
	}
}
