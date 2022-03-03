import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class NullLogger implements Contracts.Kernel.Logger {
	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
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
