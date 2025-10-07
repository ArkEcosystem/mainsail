import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { BigNumber } from "@mainsail/utils";
import { zeroAddress } from "viem";

import { describe, Sandbox } from "../../test-framework/source";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import {
	serializedTransactionContractCall,
	serializedTransactionContractCallWithSecondSignature,
	serializedTransactionDeploy,
	serializedTransactionTransfer,
	serializedTransactionTransferEqualGreater11Fields,
	serializedTransactionTransferLessThan9Fields,
	transactionTransfer,
} from "../test/fixtures/transaction";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Crypto.Validator;
	factory: Contracts.Crypto.TransactionFactory;
	serializer: Contracts.Crypto.TransactionSerializer;
	deserializer: Contracts.Crypto.TransactionDeserializer;
}>("Schemas", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.validator = context.sandbox.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		context.factory = context.sandbox.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
		context.serializer = context.sandbox.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
		context.deserializer = context.sandbox.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	const transactionOriginal = {
		value: 0,
		gasPrice: 5 * 1e9,
		gasLimit: 21000,
		nonce: 1,
		network: 10000,
		to: zeroAddress,
		senderPublicKey: "a".repeat(66),
		from: "0x" + "a".repeat(40),
		type: 0,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		assert.undefined(validator.validate("transaction", transactionOriginal).error);
	});

	it("#getSchema - value should be bigNumber", ({ validator }) => {
		const validValues = [0, "0", BigNumber.ZERO, 1, "1", BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("value"));
		}
	});

	it("#getSchema - gasPrice should be integer, min 5, max 1000 gwei", ({ sandbox, validator }) => {
		const configuration = sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(1);

		const validValues = [5, 6, 1000];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value * 1e9,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [0, -1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("gasPrice"));
		}
	});

	it("#getSchema - recipient should be optional", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
			recipientAddress: undefined,
		};

		assert.undefined(validator.validate("transaction", transaction).error);
	});

	it("factory#fromJson - should deserialize well-formed transaction", async ({ factory }) => {
		try {
			const tx = await factory.fromJson(transactionTransfer);
			//console.log(tx.serialized.toString("hex"));
			assert.equal(tx.serialized, Buffer.from(serializedTransactionTransfer, "hex"));
		} catch (ex: any) {
			console.log(ex.message);
			assert.false(true);
		}
	});

	it("factory#fromHex - should deserialize well-formed transactions", async ({ factory }) => {
		for (const serialized of [
			serializedTransactionTransfer,
			serializedTransactionContractCall,
			serializedTransactionContractCallWithSecondSignature,
			serializedTransactionDeploy,
		]) {
			await assert.resolves(async () => factory.fromHex(serialized));
		}
	});

	it("factory#fromHex - should reject transaction with trailing bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "deadbeef", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = serializedTransactionTransfer + hex;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decoded RLP contains trailing bytes",
			);
		}
	});

	it("factory#fromHex - should reject transaction with leading bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			const serializedWithTrailingBytes = hex + serializedTransactionTransfer;
			await assert.rejects(
				async () => factory.fromHex(serializedWithTrailingBytes),
				"Failed to deserialize transaction, encountered invalid bytes: decode RLP not a list",
			);
		}
	});

	it("#deserialize - should not deserialize transaction with invalid number of fields", async ({ factory }) => {
		for (const [serialized, error] of [
			[serializedTransactionTransferLessThan9Fields, "decoded RLP contains too few fields"],
			[serializedTransactionTransferEqualGreater11Fields, "decoded RLP contains too many fields"],
		]) {
			await assert.rejects(
				async () => factory.fromHex(serialized),
				`Failed to deserialize transaction, encountered invalid bytes: ${error}`,
			);
		}
	});
});
