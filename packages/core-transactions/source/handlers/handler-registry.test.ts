import { Container } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import {
	extendSchema,
	Serializer,
	Transaction,
	transactionBaseSchema,
	TransactionRegistry,
	TransactionTypeFactory,
	Utils,
	Verifier,
} from "@arkecosystem/core-crypto-transaction";
import { Application, Services } from "@arkecosystem/core-kernel";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

import { AddressFactory } from "../../../core-crypto-address-base58/source/address.factory";
import { Configuration } from "../../../core-crypto-config";
import { HashFactory } from "../../../core-crypto-hash-bcrypto/source/hash.factory";
import { KeyPairFactory } from "../../../core-crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../../core-crypto-key-pair-schnorr/source/public";
import { Signature } from "../../../core-crypto-signature-schnorr/source/signature";
import { BlockTimeCalculator } from "../../../core-crypto-time/source/block-time-calculator";
import { BlockTimeLookup } from "../../../core-crypto-time/source/block-time-lookup";
import { Slots } from "../../../core-crypto-time/source/slots";
import { MultiPaymentTransactionHandler } from "../../../core-crypto-transaction-multi-payment/source/handlers";
import { MultiSignatureRegistrationTransactionHandler } from "../../../core-crypto-transaction-multi-signature-registration/source/handlers";
import { TransferTransactionHandler } from "../../../core-crypto-transaction-transfer/source/handlers";
import { ValidatorRegistrationTransactionHandler } from "../../../core-crypto-transaction-validator-registration/source/handlers";
import { ValidatorResignationTransactionHandler } from "../../../core-crypto-transaction-validator-resignation/source/handlers";
import { VoteTransactionHandler } from "../../../core-crypto-transaction-vote/source/handlers";
import { describe } from "../../../core-test-framework/source";
import { Validator } from "../../../core-validation/source/validator";
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

	async deserialize(buf: ByteBuffer): Promise<void> {}

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "test",
		});
	}
}

abstract class TestDeactivatedTransaction extends Transaction {
	public static type: number = TEST_DEACTIVATED_TRANSACTION_TYPE;
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Test;
	public static key = "deactivated_test";

	async deserialize(buf: ByteBuffer): Promise<void> {}

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "test",
		});
	}
}

abstract class TestWithDependencyTransaction extends Transaction {
	public static type: number = DEPENDANT_TEST_TRANSACTION_TYPE;
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Test;
	public static key = "test_with_dependency";

	async deserialize(buf: ByteBuffer): Promise<void> {}

	async serialize(): Promise<ByteBuffer | undefined> {
		return undefined;
	}

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
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

	async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}
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

	async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}
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

	async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}
}

describe<{
	app: Application;
}>("Registry", ({ assert, afterEach, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		const app = new Application(new Container());

		app.bind(Identifiers.TransactionHistoryService).toConstantValue(null);
		app.bind(Identifiers.ApplicationNamespace).toConstantValue("ark-unitnet");
		app.bind(Identifiers.LogService).toConstantValue({});

		app.bind<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
			.to(Services.Attributes.AttributeSet)
			.inSingletonScope();
		app.bind(Identifiers.WalletRepository).toConstantValue({});
		app.bind(Identifiers.TransactionPoolQuery).toConstantValue({});

		app.bind(Identifiers.Cryptography.Transaction.Registry).to(TransactionRegistry);
		app.bind(Identifiers.Cryptography.Validator).to(Validator);
		app.bind(Identifiers.Cryptography.Transaction.TypeFactory).to(TransactionTypeFactory);
		app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory);
		app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory);
		app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory);
		app.bind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);
		app.bind(Identifiers.Cryptography.Signature).to(Signature);
		app.bind(Identifiers.Cryptography.Transaction.Utils).to(Utils);
		app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer);
		app.bind(Identifiers.Cryptography.HashFactory).to(HashFactory);

		app.bind(Identifiers.TransactionHandler).to(TransferTransactionHandler);
		app.bind(Identifiers.TransactionHandler).to(ValidatorRegistrationTransactionHandler);
		app.bind(Identifiers.TransactionHandler).to(VoteTransactionHandler);
		app.bind(Identifiers.TransactionHandler).to(MultiSignatureRegistrationTransactionHandler);
		app.bind(Identifiers.TransactionHandler).to(MultiPaymentTransactionHandler);
		app.bind(Identifiers.TransactionHandler).to(ValidatorResignationTransactionHandler);

		app.bind(Identifiers.TransactionHandlerProvider).to(TransactionHandlerProvider).inSingletonScope();
		app.bind(Identifiers.TransactionHandlerRegistry).to(TransactionHandlerRegistry).inSingletonScope();
		app.bind(Identifiers.TransactionHandlerConstructors).toDynamicValue(
			ServiceProvider.getTransactionHandlerConstructorsBinding(),
		);

		app.bind(Identifiers.Cryptography.Time.Slots).to(Slots).inSingletonScope();
		app.bind(Identifiers.Cryptography.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();
		app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).to(BlockTimeLookup).inSingletonScope();
		app.bind(Identifiers.Database.Service).toConstantValue({});

		app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.app = app;
	});

	it("should register core transaction types", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		await assert.resolves(() =>
			Promise.all([
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.Transfer,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.ValidatorRegistration,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.Vote,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.MultiSignature,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.MultiPayment,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
				transactionHandlerRegistry.getRegisteredHandlerByType(
					Contracts.Transactions.InternalTransactionType.from(
						Contracts.Crypto.TransactionType.ValidatorRegistration,
						Contracts.Crypto.TransactionTypeGroup.Core,
					),
				),
			]),
		);
	});

	it("should skip handler registration if provider handlerProvider is already registered", async (context) => {
		const transactionHandlerProvider = context.app.get<TransactionHandlerProvider>(
			Identifiers.TransactionHandlerProvider,
		);

		stub(transactionHandlerProvider, "isRegistrationRequired").returnValue(false);
		const registerHandlersSpy = spy(transactionHandlerProvider, "registerHandlers");

		await context.app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry);

		registerHandlersSpy.neverCalled();
	});

	it("should register a custom type", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);

		assert.not.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry);
		});
	});

	it("should register a custom type with dependency", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		context.app.bind(Identifiers.TransactionHandler).to(TestWithDependencyTransactionHandler);

		assert.not.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry);
		});
	});

	it("should register a custom type with missing dependency", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestWithDependencyTransactionHandler);

		assert.throws(() => context.app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry));
	});

	it("should be able to return handler by data", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		const keys = await context.app
			.get<Contracts.Crypto.IKeyPairFactory>(Identifiers.Cryptography.Identity.KeyPairFactory)
			.fromMnemonic("secret");
		const slots = await context.app.get<Contracts.Crypto.Slots>(Identifiers.Cryptography.Time.Slots);

		const data: Contracts.Crypto.ITransactionData = {
			amount: BigNumber.make("200000000"),
			asset: {
				test: 256,
			},
			fee: BigNumber.make("10000000"),
			nonce: BigNumber.ONE,
			recipientId: "APyFYXxXtUrvZFnEuwLopfst94GMY5Zkeq",
			senderPublicKey: keys.publicKey,
			timestamp: slots.getTime(),
			type: TEST_TRANSACTION_TYPE,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Test,
			version: 1,
		};

		assert.instance(await transactionHandlerRegistry.getActivatedHandlerForData(data), TestTransactionHandler);
	});

	it("should throw when registering the same key twice", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);

		assert.throws(() => {
			context.app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry);
		});
	});

	it("should return all registered core handlers", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		assert.length(transactionHandlerRegistry.getRegisteredHandlers(), NUMBER_OF_REGISTERED_CORE_HANDLERS);
	});

	it("should return all registered core and custom handlers", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		assert.length(transactionHandlerRegistry.getRegisteredHandlers(), NUMBER_OF_REGISTERED_CORE_HANDLERS + 1);
	});

	it("should return all active core handlers", async (context) => {
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		assert.length(await transactionHandlerRegistry.getActivatedHandlers(), NUMBER_OF_ACTIVE_CORE_HANDLERS);
	});

	it("should return all active core and custom handlers", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		assert.length(await transactionHandlerRegistry.getActivatedHandlers(), NUMBER_OF_ACTIVE_CORE_HANDLERS + 1);
	});

	it("should return a registered custom handler", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		const internalTransactionType = Contracts.Transactions.InternalTransactionType.from(
			TEST_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		assert.instance(
			transactionHandlerRegistry.getRegisteredHandlerByType(internalTransactionType),
			TestTransactionHandler,
		);

		const invalidInternalTransactionType = Contracts.Transactions.InternalTransactionType.from(
			999,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);

		await assert.rejects(() => {
			transactionHandlerRegistry.getRegisteredHandlerByType(invalidInternalTransactionType);
		}, Exceptions.InvalidTransactionTypeError);
	});

	it("should return an activated custom handler", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestTransactionHandler);
		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);

		const internalTransactionType = Contracts.Transactions.InternalTransactionType.from(
			TEST_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		assert.instance(
			await transactionHandlerRegistry.getActivatedHandlerByType(internalTransactionType),
			TestTransactionHandler,
		);

		const invalidInternalTransactionType = Contracts.Transactions.InternalTransactionType.from(
			999,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);
		await assert.rejects(
			() => transactionHandlerRegistry.getActivatedHandlerByType(invalidInternalTransactionType),
			Exceptions.InvalidTransactionTypeError,
		);
	});

	it("should not return deactivated custom handler", async (context) => {
		context.app.bind(Identifiers.TransactionHandler).to(TestDeactivatedTransactionHandler);

		const transactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);
		const internalTransactionType = Contracts.Transactions.InternalTransactionType.from(
			TEST_DEACTIVATED_TRANSACTION_TYPE,
			Contracts.Crypto.TransactionTypeGroup.Test,
		);

		await assert.rejects(
			() => transactionHandlerRegistry.getActivatedHandlerByType(internalTransactionType, 1),
			"DeactivatedTransactionHandlerError",
		);
	});
});
