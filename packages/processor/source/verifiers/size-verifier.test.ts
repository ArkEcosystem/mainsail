import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidPayloadSize, MaxPayloadExceeded } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { SizeVerifier } from "./size-verifier.js";

const headerSize = 10;

// Two transactions of 3 and 5 bytes, each prefixed with a 4 byte length: 4 + 3 + 4 + 5 = 16 bytes of payload.
const makeBlock = (overrides: Record<string, unknown> = {}) => ({
	hash: "b",
	number: 3,
	payloadSize: 16,
	serialized: "00".repeat(headerSize + 16),
	transactions: [{ serialized: Buffer.alloc(3) }, { serialized: Buffer.alloc(5) }],
	...overrides,
});

describe<{
	app: Application;
	configuration: any;
	verifier: SizeVerifier;
}>("SizeVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (block: ReturnType<typeof makeBlock>) =>
		({ getBlock: () => block }) as unknown as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ block: { maxPayload: 100 } }) };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Cryptography.Block.HeaderSize).toConstantValue(() => headerSize);

		context.verifier = context.app.resolve(SizeVerifier);
	});

	it("should accept a block whose sizes add up", async ({ configuration, verifier }) => {
		const getMilestone = spy(configuration, "getMilestone");

		await verifier.execute(makeUnit(makeBlock()));

		getMilestone.calledWith(3);
	});

	it("should accept a block without transactions", async ({ verifier }) => {
		await verifier.execute(
			makeUnit(makeBlock({ payloadSize: 0, serialized: "00".repeat(headerSize), transactions: [] })),
		);
	});

	it("should accept a block filling the maximum payload exactly", async ({ configuration, verifier }) => {
		configuration.getMilestone = () => ({ block: { maxPayload: headerSize + 16 } });

		await verifier.execute(makeUnit(makeBlock()));
	});

	it("should reject a block larger than the maximum payload", async ({ configuration, verifier }) => {
		configuration.getMilestone = () => ({ block: { maxPayload: headerSize + 15 } });

		await assert.rejects(
			() => verifier.execute(makeUnit(makeBlock())),
			MaxPayloadExceeded,
			"payload is too large 26 > 25",
		);
	});

	it("should reject a block whose serialized size differs from its header and payload size", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit(makeBlock({ serialized: "00".repeat(headerSize + 17) }))),
			InvalidPayloadSize,
			"Expected size is 26, but actual size is",
			"27",
		);
	});

	it("should reject a block whose transactions do not add up to its payload size", async ({ verifier }) => {
		await assert.rejects(
			() =>
				verifier.execute(
					makeUnit(
						makeBlock({ transactions: [{ serialized: Buffer.alloc(3) }, { serialized: Buffer.alloc(6) }] }),
					),
				),
			InvalidPayloadSize,
			"Expected size is 16, but actual size is",
			"17",
		);
	});
});
