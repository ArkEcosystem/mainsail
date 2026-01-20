import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { Logger } from "../services/logger.js";

@injectable()
export class Log {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.log(message);
	}
}
