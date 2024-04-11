import { Contracts } from "@mainsail/contracts";
import { ValidatorResignationBuilder } from "@mainsail/crypto-transaction-validator-resignation";
import { BigNumber } from "@mainsail/utils";

import { Context, ValidatorResignationOptions } from "./types.js";
import { buildSignedTransaction, getRandomFundedWallet } from "./utils.js";
import { makeValidatorRegistration } from "./validator-registrations.js";

export const makeValidatorResignation = async (
	context: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee } = options;

	sender = sender ?? wallets[0];

	fee = fee ?? "2500000000";

	const builder = app.resolve(ValidatorResignationBuilder).fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidValidatorResignation = async (
	context: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const registrationTx = makeValidatorRegistration(context, { nonceOffset: 0, sender: randomWallet });
	const resignationTx = makeValidatorResignation(context, { nonceOffset: 1, sender: randomWallet });

	return Promise.all([registrationTx, resignationTx]);
};

export const makeInvalidValidatorResignationForNonValidator = async (
	context: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const nonValidator = await getRandomFundedWallet(context);
	return makeValidatorResignation(context, { ...options, sender: nonValidator });
};

export const makeInvalidDoubleValidatorResignation = async (
	context: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const nonValidator = await getRandomFundedWallet(context);

	const registrationTx = makeValidatorRegistration(context, { nonceOffset: 0, sender: nonValidator });
	const resignationTx1 = makeValidatorResignation(context, { nonceOffset: 1, sender: nonValidator });
	const resignationTx2 = makeValidatorResignation(context, { nonceOffset: 2, sender: nonValidator });

	return Promise.all([registrationTx, resignationTx1, resignationTx2]);
};

export const makeInvalidValidatorRegistrationAfterResignation = async (
	context: Context,
	options: ValidatorResignationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const nonValidator = await getRandomFundedWallet(context);

	const registrationTx1 = makeValidatorRegistration(context, { nonceOffset: 0, sender: nonValidator });
	const resignationTx = makeValidatorResignation(context, { nonceOffset: 1, sender: nonValidator });
	const registrationTx2 = makeValidatorRegistration(context, { nonceOffset: 2, sender: nonValidator });

	return Promise.all([registrationTx1, resignationTx, registrationTx2]);
};
