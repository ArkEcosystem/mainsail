import { inject, injectable } from "@mainsail/container";
import { white } from "kleur";

import { Identifiers } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Info {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.info(white().bgBlue(`[INFO] ${message}`));
	}
}
