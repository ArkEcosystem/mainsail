import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { cloneDeep } from "@mainsail/utils";

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.TransactionData): object {
		return cloneDeep(resource);
	}

	public async transform(resource: Contracts.Crypto.TransactionData): Promise<object> {
		return this.raw(resource);
	}
}
