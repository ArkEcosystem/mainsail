export type LoggerContext = "system" | "evm" | "consensus" | "p2p" | "tx-pool" | "api";

export interface Logger {
	alert(message: string, context?: LoggerContext): void;

	error(message: string, context?: LoggerContext): void;

	warn(message: string, context?: LoggerContext): void;

	notice(message: string, context?: LoggerContext): void;

	info(message: string, context?: LoggerContext): void;

	debug(message: string, context?: LoggerContext): void;

	isValidLevel(level: string): boolean;

	suppressConsoleOutput(suppress: boolean): void;

	dispose(): Promise<void>;
}
