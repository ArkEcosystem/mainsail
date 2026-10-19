import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidBlockVersion } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { VersionVerifier } from "./version-verifier.js";

describe<{
	app: Application;
	configuration: any;
	verifier: VersionVerifier;
}>("VersionVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (block: Partial<Contracts.Crypto.Block>) =>
		({ getBlock: () => block }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ block: { version: 1 } }) };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.verifier = context.app.resolve(VersionVerifier);
	});

	it("should accept a block with the version of its milestone", async ({ configuration, verifier }) => {
		const getMilestone = spy(configuration, "getMilestone");

		await verifier.execute(makeUnit({ hash: "b", number: 3, version: 1 }));

		getMilestone.calledWith(3);
	});

	it("should reject a block with another version", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "b", number: 3, version: 2 })),
			InvalidBlockVersion,
			"Block b has invalid version.",
		);
	});
});
