import type { CommitHandler } from "./crypto/commit-handler.js";
import type { Logger as MainLogger, LoggerContext } from "./kernel/index.js";

export interface Service extends CommitHandler {
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

export interface Logger extends Omit<MainLogger, "dispose" | "suppressConsoleOutput"> {
	warnExtra(message: string, context?: LoggerContext): void;
	debugExtra(message: string, context?: LoggerContext): void;
}
