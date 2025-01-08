import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.TransactionData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: Contracts.Crypto.TransactionData): Promise<object> {
		return this.raw(resource);
	}
}
