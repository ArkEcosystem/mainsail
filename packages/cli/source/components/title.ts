import { yellow } from "kleur";

import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Title {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public async render(title: string): Promise<void> {
		this.logger.log(yellow(title));
		this.logger.log(yellow("=".repeat(title.length)));
	}
}
