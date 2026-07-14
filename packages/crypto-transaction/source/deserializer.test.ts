import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { parseTransaction } from "viem";
import { Deserialized, Serialized } from "../test/fixtures/index.js";
import {
	encodeLegacy,
	fixedWidth32,
	legacyRlpFields,
	signTransfer,
	signUntilLeadingZeroRS,
} from "../test/helpers/canonical-transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

// secp256k1 group order (n). r/s must be in [1, n).
const SECP256K1_ORDER = "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141";

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

		const canonical = await signTransfer(app);

		// Prepend a byte so r is 33 bytes on the wire — impossible for a valid signature.
		const oversized = await serializer.serialize({ ...canonical, r: "ff" + canonical.r });

		await assert.rejects(() => deserializer.deserialize(oversized), "exceeds 32 bytes");
	});

	// The canonicalization from PR #1398 made the serializer emit minimal-integer r/s but left the
	// deserializer normalizing any <=32-byte value back to 32 bytes. That accepts a second, padded
	// wire form for the same transaction — geth rejects it ("rlp: non-canonical integer"). Left
	// unclosed, a padded transaction keeps its original wire bytes through the pool into the block
	// payload, while storage persists canonical 32-byte r/s; the storage-rebuilt block then no longer
	// matches its own payloadSize and fails to deserialize when served to a peer. Reject at decode.
	it("should reject a zero-padded (non-minimal) r whose canonical form is accepted", async ({
		app,
		deserializer,
	}) => {
		// A real signature whose r (or s) has a leading zero byte: its canonical wire form is < 32 bytes.
		const canonical = await signUntilLeadingZeroRS(app);
		const component = canonical.r.startsWith("00") ? 7 : 8;
		const paddedValue = component === 7 ? canonical.r : canonical.s;

		// The canonical (minimal) wire form of exactly this transaction still deserializes.
		await assert.resolves(() => deserializer.deserialize(encodeLegacy(legacyRlpFields(canonical))));

		// The zero-padded 32-byte form of the same value is now rejected.
		const fields = legacyRlpFields(canonical);
		fields[component] = fixedWidth32(paddedValue);

		await assert.rejects(() => deserializer.deserialize(encodeLegacy(fields)), "non-canonical integer");
	});

	it("should reject a zero-padded (non-minimal) s", async ({ app, deserializer }) => {
		const canonical = await signTransfer(app);
		const fields = legacyRlpFields(canonical);

		// A 32-byte s with a leading 0x00 byte — canonical RLP would strip it to 31 bytes.
		fields[8] = fixedWidth32("00" + "11".repeat(31));

		await assert.rejects(() => deserializer.deserialize(encodeLegacy(fields)), "non-canonical integer");
	});

	it("should reject non-canonical integer fields (0x00 / leading zero)", async ({ app, deserializer }) => {
		const canonical = await signTransfer(app);

		// nonce, gasPrice, gasLimit, value, v — index → field name in the rejection message.
		const cases: [number, Uint8Array, string][] = [
			[0, new Uint8Array([0x00]), "nonce"], // zero encoded as 0x00 instead of the empty string
			[1, new Uint8Array([0x00, 0x12]), "gasPrice"], // leading zero byte
			[2, new Uint8Array([0x00, 0x52, 0x08]), "gasLimit"],
			[4, new Uint8Array([0x00, 0x01]), "value"],
			[6, new Uint8Array([0x00, 0x4e, 0x43]), "v"],
		];

		for (const [index, bytes, field] of cases) {
			const fields = legacyRlpFields(canonical);
			fields[index] = bytes;

			await assert.rejects(
				() => deserializer.deserialize(encodeLegacy(fields)),
				`decoded RLP ${field} is a non-canonical integer (leading zeroes)`,
			);
		}
	});

	it("should reject r/s outside the valid ECDSA range [1, n)", async ({ app, deserializer }) => {
		const canonical = await signTransfer(app);

		for (const component of [7, 8] as const) {
			// r/s = 0 (empty string is canonical zero, so this passes the canonical-integer check
			// and must be caught by the range check).
			const zeroFields = legacyRlpFields(canonical);
			zeroFields[component] = new Uint8Array();
			await assert.rejects(() => deserializer.deserialize(encodeLegacy(zeroFields)), "out of range");

			// r/s = n (the group order itself; valid values are strictly below it).
			const orderFields = legacyRlpFields(canonical);
			orderFields[component] = fixedWidth32(SECP256K1_ORDER);
			await assert.rejects(() => deserializer.deserialize(encodeLegacy(orderFields)), "out of range");
		}
	});
});
