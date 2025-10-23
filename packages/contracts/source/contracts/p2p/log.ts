import { Logger as MainLogger, LoggerContext } from "../kernel/index.js";

export interface Logger extends Omit<MainLogger, "dispose" | "suppressConsoleOutput"> {
	warningExtra(message: string, context?: LoggerContext): void;
	debugExtra(message: string, context?: LoggerContext): void;
}
