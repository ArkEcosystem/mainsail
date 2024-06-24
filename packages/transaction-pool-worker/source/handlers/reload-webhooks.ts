import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ReloadWebhooksHandler {
	@inject(Identifiers.Webhooks.Database)
	protected readonly database!: Contracts.Webhooks.Database;

	public async handle(): Promise<void> {
		this.database.restore();
	}
}
