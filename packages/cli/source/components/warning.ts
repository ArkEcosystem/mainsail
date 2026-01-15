import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { bgYellow, white } from "kleur/colors";

import type { Logger } from "../services/logger.js";

@injectable()
export class Warning {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.warn(white(bgYellow(`[WARNING] ${message}`)));
	}
}
