import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { Logger } from "../services/logger.js";

@injectable()
export class NewLine {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public render(count: number = 1): void {
		this.logger.log("\n".repeat(count));
	}
}
