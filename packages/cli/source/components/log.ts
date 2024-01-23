import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc";
import type { Logger } from "../services";

@injectable()
export class Log {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.log(message);
	}
}
