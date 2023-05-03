import { white } from "kleur";

import { Runtime } from "../exceptions";
import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Fatal {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.error(white().bgRed(`[ERROR] ${message}`));

		throw new Runtime.FatalException(message);
	}
}
