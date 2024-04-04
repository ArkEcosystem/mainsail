import { Contracts } from "@mainsail/contracts";
import { UsernameResignationBuilder } from "@mainsail/crypto-transaction-username-resignation";
import { BigNumber } from "@mainsail/utils";

import { Context, UsernameResignationOptions } from "./types.js";
import { makeUsernameRegistration } from "./username-registrations.js";
import { buildSignedTransaction, getRandomFundedWallet } from "./utils.js";

export const makeUsernameResignation = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee } = options;

	sender = sender ?? wallets[0];
	fee = fee ?? "2500000000";

	const builder = app.resolve(UsernameResignationBuilder).fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidUsernameResignation = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const registrationTx = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet });
	const resignationTx = makeUsernameResignation(context, { nonceOffset: 1, sender: randomWallet });

	return Promise.all([registrationTx, resignationTx]);
};

export const makeDuplicateUsernameResignation = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const registrationTx = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet });
	const resignationTx1 = makeUsernameResignation(context, { nonceOffset: 1, sender: randomWallet });
	const resignationTx2 = makeUsernameResignation(context, { nonceOffset: 2, sender: randomWallet });

	return Promise.all([registrationTx, resignationTx1, resignationTx2]);
};

export const makeInvalidUsernameResignationWithoutUsername = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	return makeUsernameResignation(context, { sender: randomWallet });
};

export const makeValidUsernameRegistrationChange = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const registrationTx1 = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet });
	const registrationTx2 = makeUsernameRegistration(context, { nonceOffset: 1, sender: randomWallet });

	return Promise.all([registrationTx1, registrationTx2]);
};

export const makeUsernameRegistrationReusePreviouslyResigned = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet1 = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const username = "reuse";

	const registrationTx1 = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet1, username });
	const resignationTx = makeUsernameRegistration(context, { nonceOffset: 1, sender: randomWallet1 });
	const registrationTx2 = makeUsernameRegistration(context, { sender: randomWallet2, username });

	return Promise.all([registrationTx1, resignationTx, registrationTx2]);
};

export const makeInvalidDuplicateUsernameRegistration = async (
	context: Context,
	options: UsernameResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet1 = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const username = "duplicate";

	const registrationTx1 = makeUsernameRegistration(context, { sender: randomWallet1, username });
	const registrationTx2 = makeUsernameRegistration(context, { sender: randomWallet2, username });

	return Promise.all([registrationTx1, registrationTx2]);
};
