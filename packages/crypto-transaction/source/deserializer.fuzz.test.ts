import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { wallet } from "../test/fixtures/index.js";
import { encodeLegacy, encodeList, encodeRlp } from "../test/helpers/canonical-transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { createRandom, MUTATIONS, randomFields } from "../test/helpers/rlp-fuzz";

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

const REGRESSIONS: [name: string, input: Buffer, canonical: boolean][] = [
	["zero address", encodeLegacy(withField(3, new Uint8Array(20))), true],
	["64 KiB data", encodeLegacy(withField(5, new Uint8Array(65_536))), true],
	["even v below 35", encodeLegacy(withField(6, Uint8Array.of(34))), false],
	["0x7f as 0x81 0x7f", withRawItem(5, [0x81, 0x7f]), false],
	["55-byte string in long form", withRawItem(5, [0xb8, 55, ...new Uint8Array(55)]), false],
	["55-byte list in long form", Buffer.concat([Buffer.from([0xf8, 55]), payloadOf55]), false],
	["nested list as a field", withRawItem(5, [0xc0]), false],
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

		const accepts = async (input: Buffer, label: string): Promise<boolean> => {
			let reserialized: Buffer;
			try {
				// fromBytes hashes a transaction with this serializer, so it rejects whatever the serializer throws on.
				reserialized = await serializer.serialize((await deserializer.deserialize(input)).data);
			} catch {
				return false;
			}

			if (!reserialized.equals(input)) {
				throw new Error(
					`${label}: accepted an encoding that re-serializes differently\n  input:        ${input.toString("hex")}\n  reserialized: ${reserialized.toString("hex")}`,
				);
			}

			return true;
		};

		// Boundary inputs the random generators rarely or never produce.
		for (const [name, input, canonical] of REGRESSIONS) {
			if (!(await accepts(input, name)) && canonical) {
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
