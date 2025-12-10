import type { Contracts } from "@mainsail/contracts";

export const toData = (message: Contracts.Crypto.Message): Contracts.Crypto.MessageData => ({
	blockHash: message.blockHash,
	blockNumber: message.blockNumber,
	round: message.round,
	signature: message.signature,
	type: message.type,
	validatorIndex: message.validatorIndex,
});
