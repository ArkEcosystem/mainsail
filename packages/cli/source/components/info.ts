import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { bgBlue, white } from "kleur/colors";

import type { Logger } from "../services/logger.js";

@injectable()
export class Info {
	@inject(Identifiers.Cli.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.info(white(bgBlue(`[INFO] ${message}`)));
	}
}
