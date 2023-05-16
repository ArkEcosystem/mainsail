import { white } from "kleur";

import { Logger } from "../services";

@injectable()
export class Info {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.info(white().bgBlue(`[INFO] ${message}`));
	}
}
