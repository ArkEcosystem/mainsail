import { buildProofOfPossession } from "./build-proof-of-possession";

import { SecretKey } from "@chainsafe/blst";
import { describe } from "@mainsail/test-runner";
import { bls12_381 } from "@noble/curves/bls12-381.js";

describe("buildProofOfPossession", ({ assert, it }) => {
	const bls = bls12_381.longSignatures;

	const POP_DST = new TextEncoder().encode("BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_");
	const SIG_DST = new TextEncoder().encode("BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_");

	const SK_A = Uint8Array.from(
		Buffer.from("67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c", "hex"),
	);
	const SK_B = Uint8Array.from(
		Buffer.from("3325023a5e4e0069558c5bd9eb7eca78b4f4c7711b9b231d9263a8edc33bc510", "hex"),
	);

	const hex = (u: Uint8Array) => Buffer.from(u).toString("hex");

	it("returns a 48-byte pk and 96-byte pop", () => {
		const { pk, pop } = buildProofOfPossession(SK_A);

		assert.instance(pk, Uint8Array);
		assert.instance(pop, Uint8Array);
		assert.equal(pk.length, 48);
		assert.equal(pop.length, 96);
	});

	it("is deterministic for the same secret key", () => {
		const a = buildProofOfPossession(SK_A);
		const b = buildProofOfPossession(SK_A);

		assert.equal(hex(a.pk), hex(b.pk));
		assert.equal(hex(a.pop), hex(b.pop));
	});

	it("produces different pk and pop for different secret keys", () => {
		const a = buildProofOfPossession(SK_A);
		const b = buildProofOfPossession(SK_B);

		assert.not.equal(hex(a.pk), hex(b.pk));
		assert.not.equal(hex(a.pop), hex(b.pop));
	});

	it("pk matches longSignatures.getPublicKey for the same secret key", () => {
		const { pk } = buildProofOfPossession(SK_A);
		const expected = bls.getPublicKey(SK_A).toBytes();

		assert.equal(hex(pk), hex(expected));
	});

	it("the produced pop verifies against the produced pk under POP_DST", () => {
		const { pk, pop } = buildProofOfPossession(SK_A);
		const messagePoint = bls.hash(pk, POP_DST);

		assert.true(bls.verify(pop, messagePoint, pk));
	});

	it("pop does NOT verify under SIG_DST", () => {
		// Load-bearing property of the POP scheme: a PoP must be unusable as a
		// regular signature on pk_bytes. If this fails, the DST constant has
		// drifted or noble's hash-to-curve DST handling broke.
		const { pk, pop } = buildProofOfPossession(SK_A);
		const wrongMessagePoint = bls.hash(pk, SIG_DST);

		assert.false(bls.verify(pop, wrongMessagePoint, pk));
	});

	it("pop does NOT verify when the pk is substituted", () => {
		// Valid PoP for A; verify against B's pk. Pairing equation expects
		// msg = pk_B, but the sig was for msg = pk_A → fails.
		const { pop: popA } = buildProofOfPossession(SK_A);
		const { pk: pkB } = buildProofOfPossession(SK_B);
		const messagePointB = bls.hash(pkB, POP_DST);

		assert.false(bls.verify(popA, messagePointB, pkB));
	});

	it("pop does NOT verify against a different message", () => {
		const { pk, pop } = buildProofOfPossession(SK_A);
		const otherMessage = new Uint8Array(48); // all zeros ≠ pk bytes
		const otherMessagePoint = bls.hash(otherMessage, POP_DST);

		assert.false(bls.verify(pop, otherMessagePoint, pk));
	});

	it("a sig built by sk_A over pk_B does not verify as B's PoP", () => {
		// Attacker scenario: "I want to register pk_B without knowing sk_B,
		// so I'll sign pk_B with sk_A and hope it passes." Must fail.
		const { pk: pkB } = buildProofOfPossession(SK_B);
		const messagePointB = bls.hash(pkB, POP_DST);
		const attemptPoint = bls.sign(messagePointB, SK_A);
		const attempt = attemptPoint.toBytes();

		assert.false(bls.verify(attempt, messagePointB, pkB));
	});

	it("throws on a secret key of wrong length", () => {
		assert.throws(() => buildProofOfPossession(new Uint8Array(31)));
		assert.throws(() => buildProofOfPossession(new Uint8Array(33)));
		assert.throws(() => buildProofOfPossession(new Uint8Array(0)));
	});

	it("throws on the zero secret key", () => {
		// sk = 0 means pk = identity → invalid scalar per BLS spec. noble rejects.
		assert.throws(() => buildProofOfPossession(new Uint8Array(32)));
	});

	it("matches the pinned test vector for SK_A", () => {
		// Tripwire against silent changes in noble's hash-to-curve / DST handling.
		// To populate / regenerate: run this test once, copy the printed hex into
		// the constants below, and re-run.
		const expectedPkHex =
			"a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d";
		const expectedPopHex =
			"878ad02e1f215d40722bd77a0148adb8dfaad4514157600a0a926cfc58589fa4e79d3d4d579cc4149237b8100efdcff110dd2a251c52543539d499c8f24b142da66d1dc19ec44b3d9c3f71112b2705e5557f932a36bd9cd9b3544ab0d9e6a677";

		const { pk, pop } = buildProofOfPossession(SK_A);

		assert.equal(hex(pk), expectedPkHex);
		assert.equal(hex(pop), expectedPopHex);
	});

	it("pk byte-equals @chainsafe/blst's compressed public key", () => {
		const { pk } = buildProofOfPossession(SK_A);
		const blstPk = SecretKey.fromBytes(SK_A).toPublicKey().toBytes(true);

		assert.equal(hex(pk), hex(blstPk));
	});
});
