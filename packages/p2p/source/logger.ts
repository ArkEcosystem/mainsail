import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Logger implements Contracts.P2P.Logger {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.alert(message, context);
	}

	error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.error(message, context);
	}

	warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.warn(message, context);
	}

	warnExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.warn(message, context);
		}
	}

	notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.notice(message, context);
	}

	info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.info(message, context);
	}

	debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.debug(message, context);
	}

	debugExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.debug(message, context);
		}
	}

	#allowExtra(): boolean {
		return process.env[EnvironmentVariables.MAINSAIL_P2P_PEER_LOG_EXTRA] === "true";
	}
}
