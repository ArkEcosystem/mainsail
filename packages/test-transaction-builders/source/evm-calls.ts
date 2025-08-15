import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { MultiPaymentAbi } from "@mainsail/evm-contracts";
import { decodeFunctionResult, encodeFunctionData, parseEther, toBytes, toHex, zeroAddress } from "viem";

import { default as DARK20 } from "./abis/DARK20.json" with { type: "json" };
import { Context, EvmCallOptions } from "./types.js";
import { buildSignedTransaction, getAddressByPublicKey } from "./utilities.js";

export const makeEvmCall = async (
	{ sandbox, wallets }: Context,
	options: EvmCallOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { value, sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		const senderRecipient = await getAddressByPublicKey({ sandbox }, sender.publicKey);
		payload = encodeErc20Transfer(senderRecipient, parseEther("1"));
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

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = Buffer.from(toBytes(DARK20.bytecode)).toString("hex");
	}

	const builder = app
		.resolve(EvmCallBuilder)
		.gasPrice(gasPrice)
		.gasLimit(gasLimit ?? 2_000_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const encodeErc20Transfer = (recipient: string, amount: number | string | bigint): string =>
	encodeFunctionData({
		abi: DARK20.abi,
		args: [recipient, amount],
		functionName: "transfer",
	}).slice(2);

export const encodeMultiPayment = (recipients: string[], amounts: (number | string | bigint)[]): string =>
	encodeFunctionData({
		abi: MultiPaymentAbi.abi,
		args: [recipients, amounts],
		functionName: "pay",
	}).slice(2);

export const getErc20BalanceOf = async (
	context: Context,
	erc20ContractAddress: string,
	walletAddress: string,
): Promise<bigint> => {
	const payload = encodeFunctionData({
		abi: DARK20.abi,
		args: [walletAddress],
		functionName: "balanceOf",
	});

	const { output } = await callViewFunction(context, {
		data: Buffer.from(toBytes(payload)),
		from: zeroAddress,
		to: erc20ContractAddress,
	});

	if (output?.byteLength === 0) {
		return 0n;
	}

	const balance = decodeFunctionResult({
		abi: DARK20.abi,
		data: toHex(output!),
		functionName: "balanceOf",
	}) as bigint;

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
