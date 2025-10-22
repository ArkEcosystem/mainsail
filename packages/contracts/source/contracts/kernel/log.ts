export type LoggerContext = "system" | "evm" | "consensus" | "p2p" | "tx-pool" | "api";

export interface Logger {
	emergency(message: string, context?: LoggerContext): void;

	alert(message: string, context?: LoggerContext): void;

	critical(message: string, context?: LoggerContext): void;

	error(message: string, context?: LoggerContext): void;

	warning(message: string, context?: LoggerContext): void;

	notice(message: string, context?: LoggerContext): void;

	info(message: string, context?: LoggerContext): void;

	debug(message: string, context?: LoggerContext): void;

	suppressConsoleOutput(suppress: boolean): void;

	dispose(): Promise<void>;
}
