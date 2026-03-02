import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { parseTransaction } from "viem";
import { Deserialized, Serialized } from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	deserializer: Contracts.Crypto.TransactionDeserializer;
}>("Deserializer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	it("should be ok", async ({ deserializer }) => {
		for (const [serialized, deserialized] of [
			[Serialized.transactionContractCall, Deserialized.transactionContractCall],
			[
				Serialized.transactionContractCallWithSecondSignature,
				Deserialized.transactionContractCallWithSecondSignature,
			],
			[Serialized.transactionDeploy, Deserialized.transactionDeploy],
			[Serialized.transactionTransfer, Deserialized.transactionTransfer],
		]) {
			await assert.equal((await deserializer.deserialize(Buffer.from(serialized, "hex"))).data, deserialized);
		}
	});

	it("should not deserialize transaction with invalid number of fields", async ({ deserializer }) => {
		for (const [serialized, error] of [
			[Serialized.transactionTransferLessThan9Fields, "decoded RLP contains too few fields"],
			[Serialized.transactionTransferEqualGreater11Fields, "decoded RLP contains too many fields"],
		]) {
			await assert.rejects(async () => deserializer.deserialize(Buffer.from(serialized, "hex")), error);
		}
	});

	it("viem should return same result", async ({ deserializer }) => {
		for (const serialized of [
			Serialized.transactionContractCall,
			Serialized.transactionDeploy,
			Serialized.transactionTransfer,
		]) {
			const ownTx = await deserializer.deserialize(Buffer.from(serialized, "hex"));
			const viemTx = parseTransaction("0x" + serialized);

			assert.equal(ownTx.data.network, viemTx.chainId);
			assert.equal(ownTx.data.to?.toLowerCase(), viemTx.to);
			assert.equal(ownTx.data.value.toString(), viemTx.value?.toString() || "0");
			assert.equal(ownTx.data.gasPrice.toString(), viemTx.gasPrice?.toString());
			assert.equal(ownTx.data.gasLimit.toString(), viemTx.gas?.toString());
			assert.equal(ownTx.data.nonce.toString(), viemTx.nonce?.toString() || "0");
			assert.equal(ownTx.data.data, viemTx.data || "0x");

			assert.equal(ownTx.data.v, Number(viemTx.v) - (2 * 10000 + 35));
			(assert.equal(ownTx.data.v, Number(viemTx.yParity)), assert.equal("0x" + ownTx.data.r, viemTx.r));
			assert.equal("0x" + ownTx.data.s, viemTx.s);
		}
	});
});
