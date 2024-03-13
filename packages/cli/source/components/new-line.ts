import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class NewLine {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(count = 1): void {
		this.logger.log("\n".repeat(count));
	}
}
