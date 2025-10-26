import { Logger as MainLogger, LoggerContext } from "../kernel/index.js";

export interface Logger extends Omit<MainLogger, "dispose" | "suppressConsoleOutput"> {
	warnExtra(message: string, context?: LoggerContext): void;
	debugExtra(message: string, context?: LoggerContext): void;
}
