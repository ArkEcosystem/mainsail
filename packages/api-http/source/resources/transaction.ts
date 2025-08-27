import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

// https://stackoverflow.com/a/53742518
type T_AND = Models.Transaction;
type T_OR = Models.Transaction;
type AnyTransaction = Partial<T_AND> & Pick<T_OR, keyof T_OR>;

export interface EnrichedTransaction extends AnyTransaction {
	state: Models.State;
	fullReceipt: boolean;
}

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: EnrichedTransaction): object {
		return { ...resource, state: undefined };
	}

	public async transform(resource: EnrichedTransaction): Promise<object> {
		let confirmations: number | undefined;
		if (resource.blockNumber) {
			confirmations = +resource.state.blockNumber - +resource.blockNumber + 1;
		}

		return {
			blockHash: resource.blockHash,
			confirmations,

			data: resource.data === "0x" ? "" : resource.data,
			from: resource.from,
			gas: resource.gas,

			gasPrice: resource.gasPrice,
			hash: resource.hash,
			nonce: resource.nonce,

			senderPublicKey: resource.senderPublicKey,
			signature: resource.signature,
			to: resource.to,

			value: resource.value,

			...(resource.legacySecondSignature ? { legacySecondSignature: resource.legacySecondSignature } : {}),

			receipt: {
				gasRefunded: resource.gasRefunded,
				gasUsed: resource.gasUsed,
				status: resource.status,
				...(resource.deployedContractAddress
					? { deployedContractAddress: resource.deployedContractAddress }
					: {}),
				...(resource.decodedError ? { decodedError: resource.decodedError } : {}),
				...(resource.fullReceipt
					? {
							logs: resource.logs,
							output: resource.output,
						}
					: {}),
			},

			timestamp: resource.timestamp ? resource.timestamp : undefined,
		};
	}
}
