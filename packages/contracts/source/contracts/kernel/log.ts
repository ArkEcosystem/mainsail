export interface Logger {
	make(options?: any): Promise<Logger>;

	emergency(message: any): void;

	alert(message: any): void;

	critical(message: any): void;

	error(message: any): void;

	warning(message: any): void;

	notice(message: any): void;

	info(message: any): void;

	debug(message: any): void;

	suppressConsoleOutput(suppress: boolean): void;

	dispose(): Promise<void>;

	//
	// setLevels(levels: Record<string, string>): void;
}
