import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { MultiPaymentBuilder } from "@mainsail/crypto-transaction-multi-payment";
import { MultiSignatureBuilder } from "@mainsail/crypto-transaction-multi-signature-registration";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { ValidatorResignationBuilder } from "@mainsail/crypto-transaction-validator-resignation";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { BigNumber } from "@mainsail/utils";
import { join } from "path";

import secrets from "../../internal/passphrases.json";
import { FactoryBuilder } from "../factory-builder";
import {
	MultiPaymentOptions,
	MultiSignatureOptions,
	TransactionOptions,
	TransferOptions,
	ValidatorRegistrationOptions,
	ValidatorResignationOptions,
	VoteOptions,
} from "../types";
import { generateApp } from "./generate-app";

const AMOUNT = 1;
const FEE = 1;

interface EntityOptions<T extends TransactionBuilder<T>> {
	entity: TransactionBuilder<T>;
	options: TransactionOptions;
}

const sign = async <T extends TransactionBuilder<T>>({
	entity,
	options,
}: EntityOptions<T>): Promise<TransactionBuilder<T>> => entity.sign(options.passphrase || secrets[0]);

const multiSign = async <T extends TransactionBuilder<T>>({
	entity,
	options,
}: EntityOptions<T>): Promise<TransactionBuilder<T>> => {
	const passphrases: string[] = options.passphrases || [secrets[0], secrets[1], secrets[2]];

	for (const [index, passphrase] of passphrases.entries()) {
		await entity.multiSign(passphrase, index);
	}

	return entity;
};

const applyModifiers = <T extends TransactionBuilder<T>>(
	entity: TransactionBuilder<T>,
	options: TransactionOptions,
): TransactionBuilder<T> => {
	entity.fee(BigNumber.make(options.fee || FEE).toFixed());

	if (options.version) {
		entity.version(options.version);
	}

	if (entity.data.version > 1 && options.nonce) {
		entity.nonce(options.nonce);
	}

	if (options.timestamp) {
		entity.data.timestamp = options.timestamp;
	}

	if (options.senderPublicKey) {
		entity.senderPublicKey(options.senderPublicKey);
	}

	return entity;
};

export const registerTransferFactory = (factory: FactoryBuilder, app: Contracts.Kernel.Application): void => {
	factory.set("Transfer", async ({ options }: { options: TransferOptions }) => {
		const transferBuilder = app.resolve(TransferBuilder);

		return applyModifiers(
			transferBuilder
				.amount(BigNumber.make(options.amount || AMOUNT).toFixed())
				.recipientId(
					options.recipientId ||
					(await app
						.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
						.fromMnemonic(secrets[0])),
				),
			options,
		);
	});

	factory
		.get("Transfer")
		.state("vendorField", ({ entity, options }) => entity.vendorField(options.vendorField || "Hello World"));

	// @ts-ignore
	factory.get("Transfer").state("sign", sign);
	// @ts-ignore
	factory.get("Transfer").state("multiSign", multiSign);
};

export const registerValidatorRegistrationFactory = (
	factory: FactoryBuilder,
	app: Contracts.Kernel.Application,
): void => {
	factory.set("ValidatorRegistration", async ({ options }: { options: ValidatorRegistrationOptions }) =>
		applyModifiers(
			app.resolve(ValidatorRegistrationBuilder).publicKeyAsset(options.publicKey || "a".repeat(96)),
			options,
		),
	);

	// @ts-ignore
	factory.get("ValidatorRegistration").state("sign", sign);
};

export const registerValidatorResignationFactory = (
	factory: FactoryBuilder,
	app: Contracts.Kernel.Application,
): void => {
	factory.set("ValidatorResignation", async ({ options }: { options: ValidatorResignationOptions }) =>
		applyModifiers(app.resolve(ValidatorResignationBuilder), options),
	);
	// @ts-ignore
	factory.get("ValidatorResignation").state("sign", sign);
};

export const registerVoteFactory = (factory: FactoryBuilder, app: Contracts.Kernel.Application): void => {
	factory.set("Vote", async ({ options }: { options: VoteOptions }) =>
		applyModifiers(
			app
				.resolve(VoteBuilder)
				.votesAsset([
					options.publicKey ||
					(await app
						.getTagged<Contracts.Crypto.PublicKeyFactory>(
							Identifiers.Cryptography.Identity.PublicKeyFactory,
							"type",
							"wallet",
						)
						.fromMnemonic(secrets[1])),
				]),
			options,
		),
	);

	// @ts-ignore
	factory.get("Vote").state("sign", sign);
	// @ts-ignore
	factory.get("Vote").state("multiSign", multiSign);
};

export const registerUnvoteFactory = (factory: FactoryBuilder, app: Contracts.Kernel.Application): void => {
	factory.set("Unvote", async ({ options }: { options: VoteOptions }) =>
		applyModifiers(
			app
				.resolve(VoteBuilder)
				.unvotesAsset([
					options.publicKey ||
					(await app
						.getTagged<Contracts.Crypto.PublicKeyFactory>(
							Identifiers.Cryptography.Identity.PublicKeyFactory,
							"type",
							"wallet",
						)
						.fromMnemonic(secrets[1])),
				]),
			options,
		),
	);

	// @ts-ignore
	factory.get("Unvote").state("sign", sign);
	// @ts-ignore
	factory.get("Unvote").state("multiSign", multiSign);
};

export const registerMultiSignature = (factory: FactoryBuilder, app: Contracts.Kernel.Application): void => {
	factory.set("MultiSignature", async ({ options }: { options: MultiSignatureOptions }) => {
		const publicKeyFactory = app.getTagged<Contracts.Crypto.PublicKeyFactory>(
			Identifiers.Cryptography.Identity.PublicKeyFactory,
			"type",
			"wallet",
		);

		const publicKeys: string[] = options.publicKeys || [
			await publicKeyFactory.fromMnemonic(secrets[0]),
			await publicKeyFactory.fromMnemonic(secrets[1]),
			await publicKeyFactory.fromMnemonic(secrets[2]),
		];

		return applyModifiers(
			app
				.resolve(MultiSignatureBuilder)
				.multiSignatureAsset({
					min: options.min || 2,
					publicKeys,
				})
				.senderPublicKey(publicKeys[0]),
			options,
		);
	});

	// @ts-ignore
	factory.get("MultiSignature").state("sign", sign);
	// @ts-ignore
	factory.get("MultiSignature").state("multiSign", multiSign);
};

export const registerMultiPaymentFactory = (factory: FactoryBuilder, app: Contracts.Kernel.Application) => {
	factory.set("MultiPayment", async ({ options }: { options: MultiPaymentOptions }) => {
		const builder = app.resolve(MultiPaymentBuilder);

		const payments = options.payments || [
			{
				amount: AMOUNT.toString(),
				recipientId: await app
					.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
					.fromMnemonic(secrets[0]),
			},
			{
				amount: AMOUNT.toString(),
				recipientId: await app
					.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
					.fromMnemonic(secrets[1]),
			},
		];

		for (const payment of payments) {
			builder.addPayment(payment.recipientId, payment.amount);
		}

		applyModifiers(builder, options);

		return builder;
	});

	// @ts-ignore
	factory.get("MultiPayment").state("sign", sign);
	// @ts-ignore
	factory.get("MultiPayment").state("multiSign", multiSign);
};

export const registerTransactionFactory = async (
	factory: FactoryBuilder,
	config?: Contracts.Crypto.NetworkConfigPartial,
): Promise<void> => {
	const app = await generateApp(
		config ?? require(join(__dirname, "../../../../core/bin/config/testnet/mainsail/crypto.json")),
	);

	registerTransferFactory(factory, app);
	registerValidatorRegistrationFactory(factory, app);
	registerValidatorResignationFactory(factory, app);
	registerVoteFactory(factory, app);
	registerUnvoteFactory(factory, app);
	registerMultiSignature(factory, app);
	registerMultiPaymentFactory(factory, app);
};
