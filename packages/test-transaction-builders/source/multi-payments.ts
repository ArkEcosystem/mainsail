import { Contracts, Identifiers } from "@mainsail/contracts";
import { MultiPaymentBuilder } from "@mainsail/crypto-transaction-multi-payment";
import { BigNumber } from "@mainsail/utils";

import { Context, MultiPaymentOptions } from "./types.js";
import { buildSignedTransaction, getAddressByPublicKey, getRandomColdWallet, getRandomFundedWallet } from "./utils.js";

export const makeMultiPayment = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee, payments } = options;

	sender = sender ?? wallets[0];
	fee = fee ?? "10000000";

	// Temporary raise limit to exceed the number of normally allowed payments
	const originalMultiPaymentLimit = app
		.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
		.getMilestone().multiPaymentLimit;

	app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).getMilestone().multiPaymentLimit =
		999;

	payments = payments ?? [
		{ amount: BigNumber.make(1000), recipientId: (await getRandomColdWallet(context)).address },
		{ amount: BigNumber.make(1000), recipientId: (await getRandomColdWallet(context)).address },
	];

	let builder = app.resolve(MultiPaymentBuilder).fee(BigNumber.make(fee).toFixed());

	for (const payment of payments ?? []) {
		builder = builder.addPayment(payment.recipientId, payment.amount.toString());
	}

	app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).getMilestone().multiPaymentLimit =
		originalMultiPaymentLimit;

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidMultiPayment = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	return makeMultiPayment(context, {
		...options,
		sender: randomWallet,
	});
};

export const makeValidMultiPaymentSameRecipients = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const recipient1 = await getRandomColdWallet(context);
	const recipient2 = await getRandomColdWallet(context);

	return makeMultiPayment(context, {
		payments: [
			{ amount: BigNumber.make(1000), recipientId: recipient1.address },
			{ amount: BigNumber.make(1000), recipientId: recipient1.address },
			{ amount: BigNumber.make(1000), recipientId: recipient2.address },
		],
		sender: randomWallet,
	});
};

export const makeValidMultiPaymentToSelf = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const senderAddress = await getAddressByPublicKey(context, randomWallet.publicKey);
	const randomRecipient = await getRandomColdWallet(context);

	return makeMultiPayment(context, {
		payments: [
			{ amount: BigNumber.make(1000), recipientId: senderAddress },
			{ amount: BigNumber.make(2000), recipientId: randomRecipient.address },
		],
		sender: randomWallet,
	});
};

export const makeValidMultiPaymentWithMaxPayments = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const payments: Contracts.Crypto.MultiPaymentItem[] = [];
	for (let index = 0; index < 256; index++) {
		const recipient = await getRandomColdWallet(context);
		payments.push({ amount: BigNumber.make(1000), recipientId: recipient.address });
	}

	return makeMultiPayment(context, {
		payments,
		sender: randomWallet,
	});
};

export const makeInvalidMultiPaymentExceedingMaxPayments = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const payments: Contracts.Crypto.MultiPaymentItem[] = [];
	for (let index = 0; index < 257; index++) {
		const recipient = await getRandomColdWallet(context);
		payments.push({ amount: BigNumber.make(1000), recipientId: recipient.address });
	}

	return makeMultiPayment(context, {
		payments,
		sender: randomWallet,
	});
};

export const makeInvalidMultiPaymentWithBadAmounts = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const recipient = await getRandomColdWallet(context);

	const { walletRepository } = context.sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	const balance = (await walletRepository.findByPublicKey(randomWallet.publicKey)).getBalance();

	const tx1 = makeMultiPayment(context, {
		nonceOffset: 0,
		payments: [
			{ amount: balance, recipientId: recipient.address },
			{ amount: BigNumber.ONE, recipientId: recipient.address },
		],
		sender: randomWallet,
	});

	const tx2 = makeMultiPayment(context, {
		nonceOffset: 1,
		payments: [
			{ amount: BigNumber.ZERO, recipientId: recipient.address },
			{ amount: BigNumber.ONE, recipientId: recipient.address },
		],
		sender: randomWallet,
	});

	return Promise.all([tx1, tx2]);
};

export const makeInvalidMultiPaymentWithMissingPayments = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const recipient = await getRandomColdWallet(context);

	const tx1 = makeMultiPayment(context, {
		callback: async (transaction) => {
			// set number of payment asset items to 1
			transaction.serialized.fill(1, 58, 59);
		},
		nonceOffset: 0,
		payments: [],
		sender: randomWallet,
	});

	const tx2 = makeMultiPayment(context, {
		callback: async (transaction) => {
			// set number of payment asset items to 10
			transaction.serialized.fill(10, 58, 59);
		},
		nonceOffset: 1,
		payments: [{ amount: BigNumber.ONE, recipientId: recipient.address }],
		sender: randomWallet,
	});

	const tx3 = makeMultiPayment(context, {
		callback: async (transaction) => {
			// set number of payment asset items to 0
			transaction.serialized.fill(10, 58, 59);
		},
		nonceOffset: 2,
		payments: [
			{ amount: BigNumber.ZERO, recipientId: recipient.address },
			{ amount: BigNumber.ONE, recipientId: recipient.address },
		],
		sender: randomWallet,
	});

	return Promise.all([tx1, tx2, tx3]);
};
