import { buildProofOfPossession } from "./build-proof-of-possession";

import { SecretKey } from "@chainsafe/blst";
import { describe } from "@mainsail/test-runner";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { bytesToHex, encodePacked, hexToBytes } from "viem";

describe("buildProofOfPossession", ({ assert, it }) => {
	const bls = bls12_381.longSignatures;

	const POP_DST = new TextEncoder().encode("MAINSAIL_BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_");
	const SIG_DST = new TextEncoder().encode("BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_");

	const SK_A = Uint8Array.from(
		Buffer.from("67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c", "hex"),
	);
	const SK_B = Uint8Array.from(
		Buffer.from("3325023a5e4e0069558c5bd9eb7eca78b4f4c7711b9b231d9263a8edc33bc510", "hex"),
	);

	const BINDING = { chainId: 10_000, registrantAddress: "0x75545540230d5c3BEf023202d23CB74cFA723376" as const };

	const hex = (u: Uint8Array) => Buffer.from(u).toString("hex");

	const message = (pk: Uint8Array, { chainId, registrantAddress } = BINDING) =>
		hexToBytes(encodePacked(["uint256", "address", "bytes"], [BigInt(chainId), registrantAddress, bytesToHex(pk)]));

	it("returns a 48-byte pk and 96-byte pop", () => {
		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);

		assert.instance(pk, Uint8Array);
		assert.instance(pop, Uint8Array);
		assert.equal(pk.length, 48);
		assert.equal(pop.length, 96);
	});

	it("is deterministic for the same secret key", () => {
		const a = buildProofOfPossession(SK_A, BINDING);
		const b = buildProofOfPossession(SK_A, BINDING);

		assert.equal(hex(a.pk), hex(b.pk));
		assert.equal(hex(a.pop), hex(b.pop));
	});

	it("produces different pk and pop for different secret keys", () => {
		const a = buildProofOfPossession(SK_A, BINDING);
		const b = buildProofOfPossession(SK_B, BINDING);

		assert.not.equal(hex(a.pk), hex(b.pk));
		assert.not.equal(hex(a.pop), hex(b.pop));
	});

	it("pk matches longSignatures.getPublicKey for the same secret key", () => {
		const { pk } = buildProofOfPossession(SK_A, BINDING);
		const expected = bls.getPublicKey(SK_A).toBytes();

		assert.equal(hex(pk), hex(expected));
	});

	it("the produced pop verifies against the produced pk under POP_DST", () => {
		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);
		const messagePoint = bls.hash(message(pk), POP_DST);

		assert.true(bls.verify(pop, messagePoint, pk));
	});

	it("pop does NOT verify under SIG_DST", () => {
		// Load-bearing property of the POP scheme: a PoP must be unusable as a
		// regular signature on pk_bytes. If this fails, the DST constant has
		// drifted or noble's hash-to-curve DST handling broke.
		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);
		const wrongMessagePoint = bls.hash(message(pk), SIG_DST);

		assert.false(bls.verify(pop, wrongMessagePoint, pk));
	});

	it("pop does NOT verify when the pk is substituted", () => {
		// Valid PoP for A; verify against B's pk. Pairing equation expects
		// msg = pk_B, but the sig was for msg = pk_A → fails.
		const { pop: popA } = buildProofOfPossession(SK_A, BINDING);
		const { pk: pkB } = buildProofOfPossession(SK_B, BINDING);
		const messagePointB = bls.hash(message(pkB), POP_DST);

		assert.false(bls.verify(popA, messagePointB, pkB));
	});

	it("pop does NOT verify against a different message", () => {
		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);
		const otherMessage = new Uint8Array(48); // all zeros ≠ pk bytes
		const otherMessagePoint = bls.hash(otherMessage, POP_DST);

		assert.false(bls.verify(pop, otherMessagePoint, pk));
	});

	it("a sig built by sk_A over pk_B does not verify as B's PoP", () => {
		// Attacker scenario: "I want to register pk_B without knowing sk_B,
		// so I'll sign pk_B with sk_A and hope it passes." Must fail.
		const { pk: pkB } = buildProofOfPossession(SK_B, BINDING);
		const messagePointB = bls.hash(message(pkB), POP_DST);
		const attemptPoint = bls.sign(messagePointB, SK_A);
		const attempt = attemptPoint.toBytes();

		assert.false(bls.verify(attempt, messagePointB, pkB));
	});

	it("pop does NOT verify for another chain id or registrant address", () => {
		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);
		const otherChain = message(pk, { ...BINDING, chainId: 11_812 });
		const otherRegistrantAddress = message(pk, {
			...BINDING,
			registrantAddress: "0xBd6F65c58A46427AF4B257cBE231D0eD69eD5508",
		});

		assert.false(bls.verify(pop, bls.hash(otherChain, POP_DST), pk));
		assert.false(bls.verify(pop, bls.hash(otherRegistrantAddress, POP_DST), pk));
	});

	it("throws on an invalid registrant address", () => {
		assert.throws(() => buildProofOfPossession(SK_A, { ...BINDING, registrantAddress: "0x1234" }));
		// A mistyped checksum must not silently bind the PoP to a different address.
		assert.throws(() =>
			buildProofOfPossession(SK_A, {
				...BINDING,
				registrantAddress: "0x75545540230d5c3bEf023202d23CB74cFA723376",
			}),
		);
	});

	it("throws on a secret key of wrong length", () => {
		assert.throws(() => buildProofOfPossession(new Uint8Array(31), BINDING));
		assert.throws(() => buildProofOfPossession(new Uint8Array(33), BINDING));
		assert.throws(() => buildProofOfPossession(new Uint8Array(0), BINDING));
	});

	it("throws on the zero secret key", () => {
		// sk = 0 means pk = identity → invalid scalar per BLS spec. noble rejects.
		assert.throws(() => buildProofOfPossession(new Uint8Array(32), BINDING));
	});

	it("matches the pinned test vector for SK_A", () => {
		// Tripwire against silent changes in noble's hash-to-curve / DST handling.
		// To populate / regenerate: run this test once, copy the printed hex into
		// the constants below, and re-run.
		const expectedPkHex =
			"a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d";
		const expectedPopHex =
			"a892e94d8ed6d0fe8792dcb31b7c5116a7d138ad4bbbd044780a7c314e86673e783850121dc34d0edfa2a2560c2f30a402f4fa5106ff71d5c69bc3027210ef90b3d3ae0a19ffc9f554b37aca72f3bb25788c3177514d94e041441ba9d029b3ba";

		const { pk, pop } = buildProofOfPossession(SK_A, BINDING);

		assert.equal(hex(pk), expectedPkHex);
		assert.equal(hex(pop), expectedPopHex);
	});

	it("pk byte-equals @chainsafe/blst's compressed public key", () => {
		const { pk } = buildProofOfPossession(SK_A, BINDING);
		const blstPk = SecretKey.fromBytes(SK_A).toPublicKey().toBytes(true);

		assert.equal(hex(pk), hex(blstPk));
	});
});
