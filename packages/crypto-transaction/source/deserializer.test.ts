import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { parseTransaction } from "viem";
import { Deserialized, Serialized } from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { TransactionBuilder } from "./builder.js";

const wallet = {
	address: "0xa92D8ba95B46bcFD0177E203C515885E91DF03F4",
	privateKey: "9be3cd2b0efa7b4d82d68496cf95f0a6c69155a410c7c29e6ec47b27478dec63",
	publicKey: "02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4",
};

// Standard Ethereum wallets RLP-encode r/s as minimal integers, stripping leading zero bytes.
const stripLeadingZeroBytes = (hex: string): string => {
	let stripped = hex;
	while (stripped.length > 2 && stripped.startsWith("00")) {
		stripped = stripped.slice(2);
	}
	return stripped;
};

// Sign transfers with increasing nonces until one has a leading zero byte in r or s
// (~1 in 128 signatures), so the minimal-RLP encoding is strictly shorter than 32 bytes.
const signUntilLeadingZeroRS = async (app: Application): Promise<Contracts.Crypto.TransactionData> => {
	const builder = app.resolve(TransactionBuilder);
	builder.recipientAddress(wallet.address);

	for (let nonce = 0; nonce < 5000; nonce++) {
		builder.nonce(String(nonce));
		await builder.signWithKeyPair({
			compressed: false,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});

		const struct = await builder.getStruct();
		if (stripLeadingZeroBytes(struct.r) !== struct.r || stripLeadingZeroBytes(struct.s) !== struct.s) {
			return struct;
		}
	}

	throw new Error("could not find a signature with a leading-zero r/s byte");
};

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

	it("should left-pad stripped (minimal-RLP) r/s back to a canonical 32 bytes", async ({ app, deserializer }) => {
		const serializer = app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);

		const canonical = await signUntilLeadingZeroRS(app);
		// A leading zero byte in r or s is exactly what the minimal-RLP wire form drops.
		assert.true(canonical.r.startsWith("00") || canonical.s.startsWith("00"));

		// The serialized wire form is minimal-RLP (leading zeros stripped) — byte-identical to
		// what a canonical Ethereum wallet emits — so at least one of r/s is under 32 bytes here.
		const wire = await serializer.serialize(canonical);

		const deserialized = await deserializer.deserialize(wire);

		// The stripped wire bytes are normalized back to the exact 32-byte values — the invariant
		// the schema and the Rust boundary rely on. Without the left-pad, the stripped component
		// would come back as fewer than 64 hex chars.
		assert.equal(deserialized.data.r.length, 64);
		assert.equal(deserialized.data.s.length, 64);
		assert.equal(deserialized.data.r, canonical.r);
		assert.equal(deserialized.data.s, canonical.s);
	});

	it("should reject r/s longer than 32 bytes", async ({ app, deserializer }) => {
		const serializer = app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);

		const builder = app.resolve(TransactionBuilder);
		await builder.signWithKeyPair({
			compressed: false,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});
		const canonical = await builder.getStruct();

		// Prepend a byte so r is 33 bytes on the wire — impossible for a valid signature.
		const oversized = await serializer.serialize({ ...canonical, r: "ff" + canonical.r });

		await assert.rejects(() => deserializer.deserialize(oversized), "exceeds 32 bytes");
	});
});
