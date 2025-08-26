import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ReceiptResource implements Contracts.Api.Resource {
	public raw(resource: Models.Transaction): object {
		return this.transform(resource);
	}

	public transform(resource: Models.Transaction): object {
		return {
			transactionHash: resource.hash,
			status: resource.status,
			blockNumber: resource.blockNumber,
			gasUsed: resource.gasUsed,
			gasRefunded: resource.gasRefunded,
			contractAddress: resource.deployedContractAddress,
			logs: resource.logs,
			output: resource.output,
		};
	}
}
