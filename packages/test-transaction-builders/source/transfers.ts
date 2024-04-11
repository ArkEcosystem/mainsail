import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { BigNumber } from "@mainsail/utils";

import { makeMultiSignatureRegistration } from "./multi-signature-registrations.js";
import { Context, TransferOptions } from "./types.js";
import {
	buildSignedTransaction,
	getMultiSignatureWallet,
	getRandomColdWallet,
	getRandomFundedWallet,
} from "./utils.js";

export const makeTransfer = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, recipient, fee, amount } = options;

	sender = sender ?? wallets[0];

	recipient = recipient ?? (await getRandomColdWallet(context)).address;

	amount = amount ?? "1";
	fee = fee ?? "10000000";

	const builder = app
		.resolve(TransferBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.recipientId(recipient)
		.amount(BigNumber.make(amount).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeTransferInvalidFee = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> => makeTransfer(context, { ...options, fee: "1234" });

export const makeTransferWithMultiSignature = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context, BigNumber.make(250 * 1e8));

	// Register multi sig wallet
	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);
	const participants = [participant1.keyPair, participant2.keyPair];

	const registrationTx = makeMultiSignatureRegistration(context, {
		nonceOffset: 0,
		participants,
		sender: randomWallet,
	});

	// Send funds to multi sig wallet
	const multiSigwallet = await getMultiSignatureWallet(context, {
		min: participants.length,
		publicKeys: participants.map((p) => p.publicKey),
	});

	const fundTx = makeTransfer(context, {
		amount: BigNumber.make(100 * 1e8),
		nonceOffset: 1,
		recipient: multiSigwallet.getAddress(),
		sender: randomWallet,
	});

	// Send funds from multi sig to another random wallet
	const transferTx = makeTransfer(context, {
		amount: BigNumber.ONE,
		multiSigKeys: participants,
	});

	return Promise.all([registrationTx, fundTx, transferTx]);
};

export const makeTransferInsufficientBalance = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const wallet = await getRandomFundedWallet(context, BigNumber.ONE);

	const { walletRepository } = context.sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	const balance = (await walletRepository.findByPublicKey(wallet.publicKey)).getBalance();

	return makeTransfer(context, { ...options, amount: balance.plus(1), sender: wallet });
};

export const makeTransferZeroBalance = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> => makeTransfer(context, { ...options, amount: BigNumber.ZERO });

export const makeTransferInvalidSignature = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		signature:
			"8dd7af61d8fa4720bf6388b5d89f8b243587697c6e65e63d2fedf3c8440594366415395075885249a0aab8b6570298491837e364c6c4f9f658c63d4633ea6ff9",
	});

export const makeTransferMalformedSignature = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		signature: "5161a55859e0be86080ca54d9",
	});

export const makeTransferInvalidNonceTooHigh = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		nonceOffset: 2,
	});

export const makeTransferInvalidNonceTooLow = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		nonceOffset: -4,
	});

export const makeTransferInvalidNetwork = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		callback: async (transaction) => {
			// set network to 37
			transaction.serialized.fill(37, 2, 3);
		},
	});

export const makeTransferInvalidHeader = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction> =>
	makeTransfer(context, {
		...options,
		callback: async (transaction) => {
			// set preamble to 3
			transaction.serialized.fill(3, 0, 1);
		},
	});

export const makeTransferInvalidVersions = async (
	context: Context,
	options: TransferOptions = {},
): Promise<Contracts.Crypto.Transaction[]> =>
	await Promise.all([
		makeTransfer(context, {
			...options,
			callback: async (transaction) => {
				// set version to 0
				transaction.serialized.fill(0, 1, 2);
			},
		}),
		makeTransfer(context, {
			...options,
			callback: async (transaction) => {
				// set version to 2
				transaction.serialized.fill(2, 1, 2);
			},
		}),
	]);
