export interface Logger {
	emergency(message: any): void;

	alert(message: any): void;

	critical(message: any): void;

	error(message: any): void;

	warning(message: any): void;

	notice(message: any): void;

	info(message: any): void;

	debug(message: any): void;

	debugExtra(message: any): void;
}
