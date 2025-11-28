import type { Contracts } from "@mainsail/contracts";

export const toData = (message: Contracts.Crypto.Precommit): Contracts.Crypto.PrecommitData => ({
	blockHash: message.blockHash,
	blockNumber: message.blockNumber,
	round: message.round,
	signature: message.signature,
	type: message.type,
	validatorIndex: message.validatorIndex,
});
