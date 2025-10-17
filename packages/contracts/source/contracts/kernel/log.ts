export interface Logger {
	emergency(message: string, context?: string): void;

	alert(message: string, context?: string): void;

	critical(message: string, context?: string): void;

	error(message: string, context?: string): void;

	warning(message: string, context?: string): void;

	notice(message: string, context?: string): void;

	info(message: string, context?: string): void;

	debug(message: string, context?: string): void;

	isValidLevel(level: string): boolean;

	suppressConsoleOutput(suppress: boolean): void;

	dispose(): Promise<void>;
}
