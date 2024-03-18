import { inject, injectable } from "@mainsail/container";
import { yellow } from "kleur/colors";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Title {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public async render(title: string): Promise<void> {
		this.logger.log(yellow(title));
		this.logger.log(yellow("=".repeat(title.length)));
	}
}
