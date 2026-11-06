import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional } from "@mainsail/container";

@injectable()
export class ReloadWebhooksHandler {
	@inject(Identifiers.Webhooks.Database)
	@optional()
	protected readonly database?: Contracts.Webhooks.Database;

	public async handle(): Promise<void> {
		this.database?.restore();
	}
}
