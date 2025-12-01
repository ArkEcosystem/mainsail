import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class NullLogger implements Contracts.Kernel.Logger {
	public async make(options?: unknown): Promise<Contracts.Kernel.Logger> {
		return this;
	}

	public alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		//
	}

	public suppressConsoleOutput(suppress: boolean): void {
		//
	}

	public async dispose(): Promise<void> {
		//
	}
}
