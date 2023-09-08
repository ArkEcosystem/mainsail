export interface Logger {
	make(options?: any): Promise<Logger>;

	emergency(message: string): void;

	alert(message: string): void;

	critical(message: string): void;

	error(message: string): void;

	warning(message: string): void;

	notice(message: string): void;

	info(message: string): void;

	debug(message: string): void;

	suppressConsoleOutput(suppress: boolean): void;

	dispose(): Promise<void>;

	//
	// setLevels(levels: Record<string, string>): void;
}
