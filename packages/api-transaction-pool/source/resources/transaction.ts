import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.Transaction): object {
		return resource.toData();
	}

	public async transform(resource: Contracts.Crypto.Transaction): Promise<object> {
		const data = resource.toData();

		return {
			...data,
			nonce: data.nonce.toString(),
			value: data.value.toString(),
		};
	}
}
