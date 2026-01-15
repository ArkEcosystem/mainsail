import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { bgRed, white } from "kleur/colors";

import type { Logger } from "../services/logger.js";

@injectable()
export class Error {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.error(white(bgRed(`[ERROR] ${message}`)));
	}
}
