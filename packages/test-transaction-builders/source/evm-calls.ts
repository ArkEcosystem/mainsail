import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ConsensusAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { decodeFunctionResult, encodeFunctionData, parseEther, toBytes, toHex, zeroAddress } from "viem";

import { default as DARK20 } from "./abis/DARK20.json" with { type: "json" };
import {
	Context,
	EvmCallOptions,
	UnvoteOptions,
	UsernameRegistrationOptions,
	UsernameResignationOptions,
	ValidatorRegistrationOptions,
	ValidatorResignationOptions,
	VoteOptions,
} from "./types.js";
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

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

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
		.resolve(TransactionBuilder)
		.gasPrice(gasPrice)
		.gasLimit(gasLimit ?? 2_000_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorRegistration = async (
	{ sandbox, wallets }: Context,
	options: ValidatorRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { value, sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeValidatorRegistration(options.validatorPublicKey ?? "");
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	if (value === undefined) {
		value = parseEther("250");
	}

	builder = builder.value(value.toString());

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorResignation = async (
	{ sandbox, wallets }: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeValidatorResignation();
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorVote = async (
	{ sandbox, wallets }: Context,
	options: VoteOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeVote(options.vote);
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorUnvote = async (
	{ sandbox, wallets }: Context,
	options: UnvoteOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeUnvote();
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeUsernameRegistration = async (
	{ sandbox, wallets }: Context,
	options: UsernameRegistrationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeUsernameRegistration(options.username);
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Usernames);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
		.payload(payload);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeUsernameResignation = async (
	{ sandbox, wallets }: Context,
	options: UsernameResignationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, gasPrice, gasLimit, payload } = options;
	sender = sender ?? wallets[0];

	gasPrice = gasPrice ?? 5 * 1e9;

	if (!payload) {
		payload = encodeUsernameResignation();
	}

	if (!recipient) {
		recipient = app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Usernames);
	}

	if (recipient === undefined) {
		throw new Error("missing recipient");
	}

	let builder = app.resolve(TransactionBuilder).gasPrice(gasPrice);

	builder = builder
		.recipientAddress(recipient)
		.gasLimit(gasLimit ?? 300_000)
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

export const encodeValidatorRegistration = (validatorPublicKey: string): string =>
	encodeFunctionData({
		abi: ConsensusAbi.abi,
		args: [validatorPublicKey?.startsWith("0x") ? validatorPublicKey : `0x${validatorPublicKey}`],
		functionName: "registerValidator",
	}).slice(2);

export const encodeUsernameRegistration = (username: string): string =>
	encodeFunctionData({
		abi: UsernamesAbi.abi,
		args: [username],
		functionName: "registerUsername",
	}).slice(2);

export const encodeUsernameResignation = (): string =>
	encodeFunctionData({
		abi: UsernamesAbi.abi,
		args: [],
		functionName: "resignUsername",
	}).slice(2);

export const encodeValidatorResignation = (): string =>
	encodeFunctionData({
		abi: ConsensusAbi.abi,
		args: [],
		functionName: "resignValidator",
	}).slice(2);

export const encodeVote = (vote: string): string =>
	encodeFunctionData({
		abi: ConsensusAbi.abi,
		args: [vote],
		functionName: "vote",
	}).slice(2);

export const encodeUnvote = (): string =>
	encodeFunctionData({
		abi: ConsensusAbi.abi,
		args: [],
		functionName: "unvote",
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
