import { Container } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import {
	extendSchema,
	InternalTransactionType,
	Serializer,
	Transaction,
	transactionBaseSchema,
	TransactionRegistry,
	TransactionTypeFactory,
	Utils,
	Verifier,
} from "@mainsail/crypto-transaction";
import { Application } from "@mainsail/kernel";
import { BigNumber, ByteBuffer } from "@mainsail/utils";
import dayjs from "dayjs";

import { AddressFactory } from "../../../crypto-address-base58/source/address.factory";
import { Configuration } from "../../../crypto-config";
import { HashFactory } from "../../../crypto-hash-bcrypto/source/hash.factory";
import { KeyPairFactory } from "../../../crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../../crypto-key-pair-schnorr/source/public";
import { Signature } from "../../../crypto-signature-schnorr/source/signature";
import { MultiPaymentTransactionHandler } from "../../../crypto-transaction-multi-payment/source/handlers";
import { MultiSignatureRegistrationTransactionHandler } from "../../../crypto-transaction-multi-signature-registration/source/handlers";
import { TransferTransactionHandler } from "../../../crypto-transaction-transfer/source/handlers";
import { ValidatorRegistrationTransactionHandler } from "../../../crypto-transaction-validator-registration/source/handlers";
import { ValidatorResignationTransactionHandler } from "../../../crypto-transaction-validator-resignation/source/handlers";
import { VoteTransactionHandler } from "../../../crypto-transaction-vote/source/handlers";
import { describe, getAttributeRepository } from "../../../test-framework";
import { Validator } from "../../../validation/source/validator";
import { ServiceProvider } from "../service-provider";
import { TransactionHandlerProvider } from "./handler-provider";
import { TransactionHandlerRegistry } from "./handler-registry";
import { TransactionHandler, TransactionHandlerConstructor } from "./transaction";

const NUMBER_OF_REGISTERED_CORE_HANDLERS = 6;
const NUMBER_OF_ACTIVE_CORE_HANDLERS = 6;

const TEST_TRANSACTION_TYPE = 100;
const DEPENDANT_TEST_TRANSACTION_TYPE = 101;
const TEST_DEACTIVATED_TRANSACTION_TYPE = 102;

abstract class TestTransaction extends Transaction {
	public static type: number = TEST_TRANSACTION_TYPE;
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Test;
	public static key = "test";

	async deserialize(buf: ByteBuffer): Promise<void> { }

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "test",
		});
	}
}

abstract class TestDeactivatedTransaction extends Transaction {
	public static type: number = TEST_DEACTIVATED_TRANSACTION_TYPE;
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Test;
	public static key = "deactivated_test";

	async deserialize(buf: ByteBuffer): Promise<void> { }

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "test",
		});
	}
}

abstract class TestWithDependencyTransaction extends Transaction {
	public static type: number = DEPENDANT_TEST_TRANSACTION_TYPE;
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Test;
	public static key = "test_with_dependency";

	async deserialize(buf: ByteBuffer): Promise<void> { }

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "test_with_dependency",
		});
	}
}

class TestTransactionHandler extends TransactionHandler {
	dependencies(): ReadonlyArray<TransactionHandlerConstructor> {
		return [];
	}

	walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	getConstructor(): Contracts.Crypto.TransactionConstructor {
		return TestTransaction;
	}

	async bootstrap(): Promise<void> {
		return;
	}

	async isActivated(): Promise<boolean> {
		return true;
	}

	async applyToRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }

	async revertForRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }
}

class TestDeactivatedTransactionHandler extends TransactionHandler {
	dependencies(): ReadonlyArray<TransactionHandlerConstructor> {
		return [];
	}

	walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	getConstructor(): Contracts.Crypto.TransactionConstructor {
		return TestDeactivatedTransaction;
	}

	async bootstrap(): Promise<void> {
		return;
	}

	async isActivated(): Promise<boolean> {
		return false;
	}

	async applyToRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }

	async revertForRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }
}

class TestWithDependencyTransactionHandler extends TransactionHandler {
	dependencies(): ReadonlyArray<TransactionHandlerConstructor> {
		return [TestTransactionHandler];
	}

	walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	getConstructor(): Contracts.Crypto.TransactionConstructor {
		return TestWithDependencyTransaction;
	}

	async bootstrap(): Promise<void> {
		return;
	}

	async isActivated(): Promise<boolean> {
		return false;
	}

	async applyToRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }

	async revertForRecipient(transaction: Contracts.Crypto.Transaction): Promise<void> { }
}

describe<{
	app: Application;
}>("Registry", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		const app = new Application(new Container());

		app.bind(Identifiers.Application.Namespace).toConstantValue("ark-unitnet");
		app.bind(Identifiers.Services.Log.Service).toConstantValue({});

		app.bind<Contracts.State.AttributeRepository>(Identifiers.State.Wallet.Attributes).toConstantValue(
			getAttributeRepository(),
		);
		app.bind(Identifiers.State.Service).toConstantValue({});
		app.bind(Identifiers.TransactionPool.Query).toConstantValue({});

		app.bind(Identifiers.Cryptography.Transaction.Registry).to(TransactionRegistry);
		app.bind(Identifiers.Cryptography.Validator).to(Validator);
		app.bind(Identifiers.Cryptography.Transaction.TypeFactory).to(TransactionTypeFactory);
		app.bind(Identifiers.Cryptography.Identity.Address.Factory).to(AddressFactory);
		app.bind(Identifiers.Cryptography.Identity.PublicKey.Factory).to(PublicKeyFactory);
		app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory);
		app.bind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);
		app.bind(Identifiers.Cryptography.Signature.Instance).to(Signature);
		app.bind(Identifiers.Cryptography.Transaction.Utils).to(Utils);
		app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer);
		app.bind(Identifiers.Cryptography.Hash.Factory).to(HashFactory);
		app.bind(Identifiers.Cryptography.Identity.PublicKey.Size).toConstantValue(32);
		app.bind(Identifiers.Cryptography.Signature.Size).toConstantValue(64);

		app.bind(Identifiers.Transaction.Handler.Instances).to(TransferTransactionHandler);
		app.bind(Identifiers.Transaction.Handler.Instances).to(ValidatorRegistrationTransactionHandler);
		app.bind(Identifiers.Transaction.Handler.Instances).to(VoteTransactionHandler);
		app.bind(Identifiers.Transaction.Handler.Instances).to(MultiSignatureRegistrationTransactionHandler);
		app.bind(Identifiers.Transaction.Handler.Instances).to(MultiPaymentTransactionHandler);
		app.bind(Identifiers.Transaction.Handler.Instances).to(ValidatorResignationTransactionHandler);

		app.bind(Identifiers.Transaction.Handler.Provider).to(TransactionHandlerProvider).inSingletonScope();
		app.bind(Identifiers.Transaction.Handler.Registry).to(TransactionHandlerRegistry).inSingletonScope();
		app.bind(Identifiers.Transaction.Handler.Constructors).toDynamicValue(
			ServiceProvider.getTransactionHandlerConstructorsBinding(),
		);

		app.bind(Identifiers.Database.Service).toConstantValue({});

		app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.app = app;
	});

	it("should register core transaction types", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		await assert.resolves(() =>
			Promise.all([
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.Transfer,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.ValidatorRegistration,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.Vote,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.MultiSignature,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.MultiPayment,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					InternalTransactionType.from(
						Contracts.Crypto.TransactionType.ValidatorRegistration,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
			]),
		);
	});

	it("should skip handler registration if provider handlerProvider is already registered", async (context) => {
		const transactionHandlerProvider = context.app.get<TransactionHandlerProvider>(
			Identifiers.Transaction.Handler.Provider,
		);

		stub(transactionHandlerProvider, "isRegistrationRequired").returnValue(false);
		const registerHandlersSpy = spy(transactionHandlerProvider, "registerHandlers");

		await context.app.get<TransactionHandlerRegistry>(Identifiers.Transaction.Handler.Registry);

		registerHandlersSpy.neverCalled();
	});

	it("should register a custom type", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);

		assert.not.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.Transaction.Handler.Registry);
		});
	});

	it("should register a custom type with dependency", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestWithDependencyTransactionHandler);

		assert.not.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.Transaction.Handler.Registry);
		});
	});

	it("should register a custom type with missing dependency", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestWithDependencyTransactionHandler);

		assert.throws(() => context.app.get<TransactionHandlerRegistry>(Identifiers.Transaction.Handler.Registry));
	});

	it("should be able to return handler by data", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		const keys = await context.app
			.get<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.fromMnemonic("secret");

		const data: Contracts.Crypto.TransactionData = {
			amount: BigNumber.make("200000000"),
			asset: {
				test: 256,
			},
			fee: BigNumber.make("10000000"),
			nonce: BigNumber.ONE,
			recipientId: "APyFYXxXtUrvZFnEuwLopfst94GMY5Zkeq",
			senderPublicKey: keys.publicKey,
			timestamp: dayjs().valueOf(),
			type: TEST_TRANSACTION_TYPE,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Test,
			version: 1,
		};

		assert.instance(await transactionHandlerRegistry.getActivatedHandlerForData(data), TestTransactionHandler);
	});

	it("should throw when registering the same key twice", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);

		assert.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.Transaction.Handler.Registry);
		});
	});

	it("should return all registered core handlers", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		assert.length(transactionHandlerRegistry.getRegisteredHandlers(), NUMBER_OF_REGISTERED_CORE_HANDLERS);
	});

	it("should return all registered core and custom handlers", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		assert.length(transactionHandlerRegistry.getRegisteredHandlers(), NUMBER_OF_REGISTERED_CORE_HANDLERS + 1);
	});

	it("should return all active core handlers", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		assert.length(await transactionHandlerRegistry.getActivatedHandlers(), NUMBER_OF_ACTIVE_CORE_HANDLERS);
	});

	it("should return all active core and custom handlers", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		assert.length(await transactionHandlerRegistry.getActivatedHandlers(), NUMBER_OF_ACTIVE_CORE_HANDLERS + 1);
	});

	it("should return a registered custom handler", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		const internalTransactionType = InternalTransactionType.from(
			TEST_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		assert.instance(
			transactionHandlerRegistry.getRegisteredHandlerByType(internalTransactionType),
			TestTransactionHandler,
		);

		const invalidInternalTransactionType = InternalTransactionType.from(
			999,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);

		await assert.rejects(() => {
			transactionHandlerRegistry.getRegisteredHandlerByType(invalidInternalTransactionType);
		}, Exceptions.InvalidTransactionTypeError);
	});

	it("should return an activated custom handler", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);

		const internalTransactionType = InternalTransactionType.from(
			TEST_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		assert.instance(
			await transactionHandlerRegistry.getActivatedHandlerByType(internalTransactionType),
			TestTransactionHandler,
		);

		const invalidInternalTransactionType = InternalTransactionType.from(
			999,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		await assert.rejects(
			() => transactionHandlerRegistry.getActivatedHandlerByType(invalidInternalTransactionType),
			Exceptions.InvalidTransactionTypeError,
		);
	});

	it("should not return deactivated custom handler", async (context) => {
		context.app.bind(Identifiers.Transaction.Handler.Instances).to(TestDeactivatedTransactionHandler);

		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.Transaction.Handler.Registry,
		);
		const internalTransactionType = InternalTransactionType.from(
			TEST_DEACTIVATED_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);

		await assert.rejects(
			() => transactionHandlerRegistry.getActivatedHandlerByType(internalTransactionType, 1),
			"DeactivatedTransactionHandlerError",
		);
	});
});
