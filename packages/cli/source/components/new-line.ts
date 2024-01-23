import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc";
import type { Logger } from "../services";

@injectable()
export class NewLine {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(count = 1): void {
		this.logger.log("\n".repeat(count));
	}
}
