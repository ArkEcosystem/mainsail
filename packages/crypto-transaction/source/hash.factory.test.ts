import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { HashFactory } from "./hash.factory.js";
import { Serializer } from "./serializer.js";
import {
	Deserialized,
} from "../test/fixtures/index.js";

describe<{
	hasher: HashFactory;
}>("HashFactory", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		const app = new Application();

		app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer);
		context.hasher = app.resolve(HashFactory)
	});

	it("#toHash - should be ok", async ({ hasher }) => {
		for (const [tx, expectedHash] of [
			[Deserialized.transactionContractCall, "1c54b0cd259d807f8b8a1afbedc36ffcd1ba2feaed306c6ac958b59644028572"],
			[Deserialized.transactionContractCallWithSecondSignature, "1c54b0cd259d807f8b8a1afbedc36ffcd1ba2feaed306c6ac958b59644028572"],
			[Deserialized.transactionDeploy, "82800039759baa5c05356b1106995efa6334d3b321ec693ed04aaca482843618"],
			[Deserialized.transactionTransfer, "3a5823fe8f498b2e509974b3939584bd1200ad32fa32bc8a1a778b608f79f780"],
		]) {
			const hash = await hasher.toHash(tx);
			assert.equal(hash.toString("hex"), expectedHash);
		}
	});

	it("#toHashUnsigned - should be ok", async ({ hasher }) => {
		for (const [tx, expectedHash] of [
			[Deserialized.transactionContractCall, "a037cecd15ad24cbccd89b7610f6d7e80482b935798230d3b22c897c91bddc51"],
			[Deserialized.transactionContractCallWithSecondSignature, "a037cecd15ad24cbccd89b7610f6d7e80482b935798230d3b22c897c91bddc51"],
			[Deserialized.transactionDeploy, "2a3d4cd4be0a68377d440796fbabcbdbe93ddb20b4cfdced51ff98e2695a4114"],
			[Deserialized.transactionTransfer, "4c4c3782c3e17ebafde372ddd7218c5ddff31315fad31b14a6d69bc68bb5dd4a"],
		]) {
			const hash = await hasher.toHashUnsigned(tx);
			assert.equal(hash.toString("hex"), expectedHash);
		}
	});
});
