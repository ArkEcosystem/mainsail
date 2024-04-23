import { Contracts } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { BigNumber } from "@mainsail/utils";

import { Context, EvmCallOptions } from "./types.js";
import { buildSignedTransaction } from "./utils.js";

export const makeEvmCall = async (
	{ sandbox, wallets }: Context,
	options: EvmCallOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	fee = fee ?? "100000000";

	const builder = app
		.resolve(EvmCallBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.gasLimit(gasLimit ?? 100_000)
		.payload(payload ?? "0x00");

	return buildSignedTransaction(sandbox, builder, sender, options);
};
