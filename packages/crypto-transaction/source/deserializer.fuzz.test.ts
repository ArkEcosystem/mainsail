import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { InvalidAddressError } from "viem";

import { wallet } from "../test/fixtures/index.js";
import { encodeLegacy, encodeList, encodeRlp } from "../test/helpers/canonical-transaction.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox.js";
import { createRandom, MUTATIONS, randomFields } from "../test/helpers/rlp-fuzz.js";

// Reproduce a failure with the FUZZ_SEED and FUZZ_RUNS it prints. Run longer with e.g. FUZZ_RUNS=100000.
const SEED = Number(process.env.FUZZ_SEED ?? 1403);
const RUNS = Number(process.env.FUZZ_RUNS ?? 10000);

const BASE = [[1], [1], [1], [...Buffer.from(wallet.address.slice(2), "hex")], [1], [], [37], [1], [1]].map((field) =>
	Uint8Array.from(field),
);

const withField = (index: number, value: Uint8Array): Uint8Array[] =>
	BASE.map((field, position) => (position === index ? value : field));

const withRawItem = (index: number, item: number[]): Buffer =>
	encodeList(BASE.map((field, position) => (position === index ? Buffer.from(item) : encodeRlp(field))));

const payloadOf55 = Buffer.concat(
	withField(5, new Uint8Array(55 - encodeLegacy(BASE).length + 1)).map((field) => encodeRlp(field)),
);

const REGRESSIONS: [name: string, input: Buffer, expected: "accept" | "reject"][] = [
	["zero address", encodeLegacy(withField(3, new Uint8Array(20))), "accept"],
	["64 KiB data", encodeLegacy(withField(5, new Uint8Array(65_536))), "accept"],
	["0x7f as 0x81 0x7f", withRawItem(5, [0x81, 0x7f]), "reject"],
	["55-byte string in long form", withRawItem(5, [0xb8, 55, ...new Uint8Array(55)]), "reject"],
	["55-byte list in long form", Buffer.concat([Buffer.from([0xf8, 55]), payloadOf55]), "reject"],
	["nested list as a field", withRawItem(5, [0xc0]), "reject"],
];

describe<{
	app: Application;
	deserializer: Contracts.Crypto.TransactionDeserializer;
	serializer: Contracts.Crypto.TransactionSerializer;
}>("Deserializer (fuzz)", ({ it, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
		context.serializer = context.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
	});

	// Nodes rebuild stored transactions with the serializer when they serve a block, so any accepted
	// encoding that re-serializes differently no longer matches the block's payloadSize.
	it("should accept only encodings that re-serialize to identical bytes", async ({ deserializer, serializer }) => {
		if (!Number.isSafeInteger(SEED) || !Number.isSafeInteger(RUNS) || RUNS < 1) {
			throw new Error("FUZZ_SEED and FUZZ_RUNS must be integers, FUZZ_RUNS at least 1");
		}

		// Only the deserializer's own errors (and viem's checksum error for a malformed `to`) count as
		// rejections; anything else is a crash on malformed input and fails the run.
		const isRejection = (error: unknown): boolean =>
			error instanceof InvalidAddressError || (error instanceof Error && /^decoded? RLP /.test(error.message));

		const accepts = async (input: Buffer, label: string): Promise<boolean> => {
			let reserialized: Buffer;
			try {
				reserialized = await serializer.serialize((await deserializer.deserialize(input)).data);
			} catch (error) {
				if (isRejection(error)) {
					return false;
				}

				throw new Error(`${label}: crashed on input ${input.toString("hex")}`, { cause: error });
			}

			if (!reserialized.equals(input)) {
				throw new Error(
					`${label}: accepted an encoding that re-serializes differently\n  input:        ${input.toString("hex")}\n  reserialized: ${reserialized.toString("hex")}`,
				);
			}

			return true;
		};

		// Boundary inputs the random generators rarely or never produce.
		for (const [name, input, expected] of REGRESSIONS) {
			const accepted = await accepts(input, name);
			if (accepted && expected === "reject") {
				throw new Error(`${name}: accepted a non-canonical encoding\n  input: ${input.toString("hex")}`);
			}

			if (!accepted && expected === "accept") {
				throw new Error(`${name}: rejected a canonical encoding\n  input: ${input.toString("hex")}`);
			}
		}

		const random = createRandom(SEED);

		for (let run = 0; run < RUNS; run++) {
			const label = `FUZZ_SEED=${SEED} FUZZ_RUNS=${run + 1}`;
			const fields = randomFields(random);
			const canonical = encodeLegacy(fields);

			if (!(await accepts(canonical, label))) {
				throw new Error(`${label}: rejected a canonical encoding\n  input: ${canonical.toString("hex")}`);
			}

			for (const [name, mutate] of MUTATIONS) {
				await accepts(mutate(random, fields), `${label} ${name}`);
			}
		}
	});
});
