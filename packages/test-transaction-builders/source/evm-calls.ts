import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { BigNumberish, ethers } from "ethers";

import { default as DARK20 } from "./abis/DARK20.json" assert { type: "json" };
import { Context, EvmCallOptions } from "./types.js";
import { buildSignedTransaction, getAddressByPublicKey } from "./utils.js";

export const makeEvmCall = async (
	{ sandbox, wallets }: Context,
	options: EvmCallOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { value, sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5;

	if (!payload) {
		const senderRecipient = await getAddressByPublicKey({ sandbox }, sender.publicKey);
		payload = encodeErc20Transfer(senderRecipient, ethers.parseEther("1"));
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(EvmCallBuilder).gasPrice(gasPrice);

	if (value) {
		builder = builder.value(value.toString());
	}

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 100_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeEvmCallDeployErc20Contract = async (
	{ sandbox, wallets }: Context,
	options: EvmCallOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5;

	if (!payload) {
		payload = Buffer.from(ethers.getBytes(DARK20.bytecode)).toString("hex");
	}

	const builder = app
		.resolve(EvmCallBuilder)
		.gasPrice(gasPrice)
		.gasLimit(gasLimit ?? 2_000_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const encodeErc20Transfer = (recipient: string, amount: BigNumberish): string => {
	const iface = new ethers.Interface(DARK20.abi);
	return iface.encodeFunctionData("transfer", [recipient, amount]).slice(2);
};

export const getErc20BalanceOf = async (
	context: Context,
	erc20ContractAddress: string,
	walletAddress: string,
): Promise<BigNumberish> => {
	const iface = new ethers.Interface(DARK20.abi);

	const payload = iface.encodeFunctionData("balanceOf", [walletAddress]).slice(2);

	const result = await callViewFunction(context, {
		caller: ethers.ZeroAddress,
		data: Buffer.from(ethers.getBytes(`0x${payload}`)),
		recipient: erc20ContractAddress,
	});

	const [balance] = iface.decodeFunctionResult("balanceOf", result.output!);
	return balance;
};

export const callViewFunction = async (
	{ sandbox }: Context,
	viewContext: Omit<Contracts.Evm.TransactionViewContext, "specId">,
): Promise<Contracts.Evm.ViewResult> => {
	const instance = sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
	return instance.view({ ...viewContext, specId: Contracts.Evm.SpecId.LATEST });
};

export * as ContractAbis from "@mainsail/evm-contracts";
