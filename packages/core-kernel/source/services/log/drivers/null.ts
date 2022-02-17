import { Logger } from "../../../contracts/kernel/log";
import { injectable } from "../../../ioc";

@injectable()
export class NullLogger implements Logger {
	public async make(options?: any): Promise<Logger> {
		return this;
	}

	public emergency(message: any): void {
		//
	}

	public alert(message: any): void {
		//
	}

	public critical(message: any): void {
		//
	}

	public error(message: any): void {
		//
	}

	public warning(message: any): void {
		//
	}

	public notice(message: any): void {
		//
	}

	public info(message: any): void {
		//
	}

	public debug(message: any): void {
		//
	}

	public suppressConsoleOutput(suppress: boolean): void {
		//
	}

	public async dispose(): Promise<void> {
		//
	}
}
