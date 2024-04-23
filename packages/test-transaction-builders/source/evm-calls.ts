import { Contracts } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { ContractAbis, Identifiers as EvmDevelopmentIdentifiers } from "@mainsail/evm-development";
import { BigNumber } from "@mainsail/utils";
import { ethers } from "ethers";

import { Context, EvmCallOptions } from "./types.js";
import { buildSignedTransaction, getAddressByPublicKey } from "./utils.js";
import { BigNumberish } from "ethers";

export { ContractAbis };

export const makeEvmCall = async (
	{ sandbox, wallets }: Context,
	options: EvmCallOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	fee = fee ?? "2500000000";

	if (!payload) {
		const senderRecipient = await getAddressByPublicKey({ sandbox }, sender.publicKey);
		payload = encodeErc20Transfer(senderRecipient, ethers.parseEther("1"));
	}

	const recipient = sandbox.app.get<string>(EvmDevelopmentIdentifiers.Contracts.Addresses.Erc20);
	const builder = app
		.resolve(EvmCallBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.recipientId(recipient)
		.gasLimit(gasLimit ?? 100_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const encodeErc20Transfer = (recipient: string, amount: BigNumberish): string => {
	const iface = new ethers.Interface(ContractAbis.ERC20.abi.abi);
	return iface.encodeFunctionData("transfer", [recipient, amount]).slice(2);
};
