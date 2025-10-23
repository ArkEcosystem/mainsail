import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NullLogger implements Contracts.Kernel.Logger {
	public async make(options?: any): Promise<Contracts.Kernel.Logger> {
		return this;
	}

	public alert(message: any): void {
		//
	}

	public error(message: any): void {
		//
	}

	public warn(message: any): void {
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
