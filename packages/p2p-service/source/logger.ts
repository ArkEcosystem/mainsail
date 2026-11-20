import type { Contracts } from "@mainsail/contracts";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Logger implements Contracts.P2PService.Logger {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.alert(message, context);
	}

	public error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.error(message, context);
	}

	public warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.warn(message, context);
	}

	public warnExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.warn(message, context);
		}
	}

	public notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.notice(message, context);
	}

	public info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.info(message, context);
	}

	public debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.debug(message, context);
	}

	public debugExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.debug(message, context);
		}
	}

	#allowExtra(): boolean {
		return process.env[EnvironmentVariables.MAINSAIL_P2P_PEER_LOG_EXTRA] === "true";
	}
}
