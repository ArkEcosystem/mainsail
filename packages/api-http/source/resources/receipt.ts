import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class ReceiptResource implements Contracts.Api.Resource {
	public raw(resource: Models.Transaction): object {
		return this.transform(resource);
	}

	public transform(resource: Models.Transaction): object {
		return {
			blockNumber: resource.blockNumber,
			contractAddress: resource.deployedContractAddress,
			cumulativeGasUsed: resource.cumulativeGasUsed,
			gasRefunded: resource.gasRefunded,
			gasUsed: resource.gasUsed,
			logs: resource.logs,
			output: resource.output,
			status: resource.status,
			transactionHash: resource.hash,
			...(resource.decodedError ? { decodedError: resource.decodedError } : {}),
		};
	}
}
