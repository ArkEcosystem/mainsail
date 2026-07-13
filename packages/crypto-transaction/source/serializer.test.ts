import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { keccak256, serializeTransaction } from "viem";
import { Serialized, Transactions } from "../test/fixtures/index";
import { signUntilLeadingZeroRS } from "../test/helpers/canonical-transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	deserializer: Contracts.Crypto.TransactionDeserializer;
	serializer: Contracts.Crypto.TransactionSerializer;
}>("Serializer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	it("#serialize - should give same result after deserialization", async ({ serializer, deserializer }) => {
		for (const serialized of [
			Serialized.transactionContractCall,
			Serialized.transactionContractCallWithSecondSignature,
			Serialized.transactionDeploy,
			Serialized.transactionTransfer,
		]) {
			const deserialized = await deserializer.deserialize(Buffer.from(serialized, "hex"));
			const reserialized = await serializer.serialize(deserialized.data);
			assert.equal(serialized, reserialized.toString("hex"));
		}
	});

	it("#serialize - should give same result for predefined transactions", async ({ serializer, deserializer }) => {
		for (const [serialized, transaction] of [
			[Serialized.transactionContractCall, Transactions.transactionContractCall],
			[
				Serialized.transactionContractCallWithSecondSignature,
				Transactions.transactionContractCallWithSecondSignature,
			],
			[Serialized.transactionDeploy, Transactions.transactionDeploy],
			[Serialized.transactionTransfer, Transactions.transactionTransfer],
		]) {
			const reserialized = await serializer.serialize(transaction);
			assert.equal(serialized, reserialized.toString("hex"));
		}
	});

	it.skip("#serialize - should be ok without signature", async ({ serializer, deserializer }) => {
		for (const serialized of [
			Serialized.transactionContractCall,
			Serialized.transactionContractCallWithSecondSignature,
			Serialized.transactionDeploy,
			Serialized.transactionTransfer,
		]) {
			const deserializedFull = await deserializer.deserialize(Buffer.from(serialized, "hex"));
			const reserialized = await serializer.serialize(deserializedFull.data);
			const deserializedWithoutSignature = await deserializer.deserialize(reserialized);

			// Remove v,r, s
			const deserializedFullData = (({ v, r, s, ...rest }) => rest)(deserializedFull.data);
			const deserializedWithoutSignatureData = (({ v, r, s, ...rest }) => rest)(
				deserializedWithoutSignature.data,
			);

			assert.equal(deserializedFullData, deserializedWithoutSignatureData);
		}
	});

	it("#serializeUnsigned - should give same result as viem", async ({ serializer, deserializer }) => {
		for (const transaction of [
			Transactions.transactionContractCall,
			Transactions.transactionDeploy,
			Transactions.transactionTransfer,
		]) {
			const ownSerialized = await serializer.serializeUnsigned(transaction);

			const viemTransaction = {
				chainId: transaction.network,
				gas: BigInt(transaction.gasLimit.toString()),
				gasPrice: BigInt(transaction.gasPrice.toString()),
				nonce: Number(transaction.nonce.toString()),
				to: transaction.to,
				value: BigInt(transaction.value.toString()),
				data: transaction.data === "0x" ? undefined : transaction.data,
			};
			const viemSerialized = serializeTransaction(viemTransaction);

			assert.equal("0x" + ownSerialized.toString("hex"), viemSerialized);
		}
	});

	it("#serialize - should give same result as viem", async ({ serializer, deserializer }) => {
		for (const transaction of [
			Transactions.transactionContractCall,
			Transactions.transactionDeploy,
			Transactions.transactionTransfer,
		]) {
			const ownSerialized = await serializer.serialize(transaction);

			const viemTransaction = {
				chainId: transaction.network,
				gas: BigInt(transaction.gasLimit.toString()),
				gasPrice: BigInt(transaction.gasPrice.toString()),
				nonce: Number(transaction.nonce.toString()),
				to: transaction.to,
				value: BigInt(transaction.value.toString()),
				data: transaction.data === "0x" ? undefined : transaction.data,
			};

			const signature = {
				r: "0x" + transaction.r,
				s: "0x" + transaction.s,
				v: BigInt(transaction.v + (2 * 10000 + 35)),
			};

			const viemSerialized = serializeTransaction(viemTransaction, signature);
			assert.equal("0x" + ownSerialized.toString("hex"), viemSerialized);
		}
	});

	it("#serialize - should match viem (and the standard hash) when r/s has a leading zero", async ({
		app,
		serializer,
	}) => {
		const hashFactory = app.get<Contracts.Crypto.TransactionHashFactory>(
			Identifiers.Cryptography.Transaction.HashFactory,
		);

		// Sign until r or s has a leading zero byte (~1 in 128), the case where minimal-RLP
		// encoding is strictly shorter than 32 bytes and standard tooling and mainsail could
		// otherwise disagree.
		const canonical = await signUntilLeadingZeroRS(app);

		const ownSerialized = await serializer.serialize(canonical);

		const viemSerialized = serializeTransaction(
			{
				chainId: canonical.network,
				data: canonical.data === "0x" ? undefined : (canonical.data as `0x${string}`),
				gas: BigInt(canonical.gasLimit.toString()),
				gasPrice: BigInt(canonical.gasPrice.toString()),
				nonce: Number(canonical.nonce.toString()),
				to: canonical.to as `0x${string}`,
				value: canonical.value,
			},
			{
				r: `0x${canonical.r}`,
				s: `0x${canonical.s}`,
				v: BigInt(canonical.v + (2 * 10000 + 35)),
			},
		);

		// Byte-identical to canonical Ethereum, so the transaction hash (keccak of the
		// serialized bytes) is what MetaMask/ethers/viem compute — interoperable out of the box.
		assert.equal("0x" + ownSerialized.toString("hex"), viemSerialized);
		assert.equal("0x" + (await hashFactory.toHash(canonical)).toString("hex"), keccak256(viemSerialized));
	});
});
