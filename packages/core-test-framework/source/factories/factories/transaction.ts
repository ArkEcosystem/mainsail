// import { BigNumber } from "@arkecosystem/utils";
// import { MultiPaymentBuilder } from "packages/core-crypto-transaction-multi-payment/distribution";

// import secrets from "../../internal/passphrases.json";
import { FactoryBuilder } from "../factory-builder";
// import { FactoryFunctionOptions } from "../types";

// const sign = ({ entity, options }: FactoryFunctionOptions) => entity.sign(options.passphrase || secrets[0]);

// const multiSign = ({ entity, options }: FactoryFunctionOptions) => {
// 	const passphrases: string[] = options.passphrases || [secrets[0], secrets[1], secrets[2]];

// 	for (const [index, passphrase] of passphrases.entries()) {
// 		entity.multiSign(passphrase, index);
// 	}

// 	return entity;
// };

// const applyModifiers = (entity, options) => {
// 	if (options.version) {
// 		entity.version(options.version);
// 	}

// 	if (entity.data.version > 1 && options.nonce) {
// 		entity.nonce(options.nonce);
// 	}

// 	if (options.fee) {
// 		entity.fee(options.fee.toFixed());
// 	}

// 	if (options.timestamp) {
// 		entity.data.timestamp = options.timestamp;
// 	}

// 	if (options.senderPublicKey) {
// 		entity.senderPublicKey(options.senderPublicKey);
// 	}

// 	if (options.expiration) {
// 		entity.expiration(options.expiration);
// 	}

// 	return entity;
// };

// export const registerTransferFactory = (factory: FactoryBuilder): void => {
// 	factory.set("Transfer", ({ options }) =>
// 		applyModifiers(
// 			Transactions.BuilderFactory.transfer()
// 				.amount(BigNumber.make(options.amount || 1).toFixed())
// 				.recipientId(options.recipientId || this.addressFactory.fromMnemonic(secrets[0])),
// 			options,
// 		),
// 	);

// 	factory
// 		.get("Transfer")
// 		.state("vendorField", ({ entity, options }) => entity.vendorField(options.vendorField || "Hello World"));

// 	factory.get("Transfer").state("sign", sign);
// 	factory.get("Transfer").state("multiSign", multiSign);
// };

// export const registerValidatorRegistrationFactory = (factory: FactoryBuilder): void => {
// 	factory.set("ValidatorRegistration", ({ options }) =>
// 		Transactions.BuilderFactory.validatorRegistration().usernameAsset(
// 			options.username || Math.random().toString(36).slice(8),
// 		),
// 	);

// 	factory.get("ValidatorRegistration").state("sign", sign);
// };

// export const registerValidatorResignationFactory = (factory: FactoryBuilder): void => {
// 	factory.set("ValidatorResignation", () => Transactions.BuilderFactory.validatorResignation());
// 	factory.get("ValidatorResignation").state("sign", sign);
// };

// export const registerVoteFactory = (factory: FactoryBuilder): void => {
// 	factory.set("Vote", ({ options }) =>
// 		applyModifiers(
// 			Transactions.BuilderFactory.vote().votesAsset([
// 				`+${options.publicKey || this.publicKeyFactory.fromMnemonic(secrets[1])}`,
// 			]),
// 			options,
// 		),
// 	);

// 	factory.get("Vote").state("sign", sign);
// 	factory.get("Vote").state("multiSign", multiSign);
// };

// export const registerUnvoteFactory = (factory: FactoryBuilder): void => {
// 	factory.set("Unvote", ({ options }) =>
// 		applyModifiers(
// 			Transactions.BuilderFactory.vote().votesAsset([
// 				`-${options.publicKey || this.publicKeyFactory.fromMnemonic(secrets[1])}`,
// 			]),
// 			options,
// 		),
// 	);

// 	factory.get("Unvote").state("sign", sign);
// 	factory.get("Unvote").state("multiSign", multiSign);
// };

// export const registerMultiSignature = (factory: FactoryBuilder): void => {
// 	factory.set("MultiSignature", ({ options }) => {
// 		const builder = applyModifiers(Transactions.BuilderFactory.multiSignature(), options);

// 		const publicKeys: string[] = options.publicKeys || [
// 			this.publicKeyFactory.fromMnemonic(secrets[0]),
// 			this.publicKeyFactory.fromMnemonic(secrets[1]),
// 			this.publicKeyFactory.fromMnemonic(secrets[2]),
// 		];

// 		builder
// 			.multiSignatureAsset({
// 				min: options.min || 2,
// 				publicKeys,
// 			})
// 			.senderPublicKey(publicKeys[0]);

// 		return builder;
// 	});

// 	factory.get("MultiSignature").state("sign", sign);
// 	factory.get("MultiSignature").state("multiSign", multiSign);
// };

// export const registerMultiPaymentFactory = async (factory: FactoryBuilder) => {
// 	factory.set("MultiPayment", ({ options }) =>
// 		applyModifiers(
// 			(new MultiPaymentBuilder).addPayment(
// 				options.recipientId || await this.addressFactory.fromMnemonic(secrets[0]),
// 				BigNumber.make(options.amount || 1).toFixed(),
// 			),
// 			options,
// 		),
// 	);

// 	factory.get("MultiPayment").state("sign", sign);
// 	factory.get("MultiPayment").state("multiSign", multiSign);
// };

export const registerTransactionFactory = (factory: FactoryBuilder): void => {
	// registerTransferFactory(factory);
	// registerValidatorRegistrationFactory(factory);
	// registerValidatorResignationFactory(factory);
	// registerVoteFactory(factory);
	// registerUnvoteFactory(factory);
	// registerMultiSignature(factory);
	// registerMultiPaymentFactory(factory);
};
