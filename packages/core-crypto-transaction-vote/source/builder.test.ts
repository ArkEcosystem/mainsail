import { Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { describe, Sandbox } from "../../core-test-framework";
import { VoteBuilder } from "./builder";
import { VoteTransaction } from "./versions/1";

describe<{
	builder: VoteBuilder;
}>("Builder", ({ beforeEach, it, assert }) => {
	beforeEach((contex) => {
		const sandbox = new Sandbox();

		sandbox.app.bind(Identifiers.Cryptography.Identity.AddressFactory).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Transaction.Signer).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Transaction.Utils).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Transaction.Verifier).toConstantValue({});
		sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue({});

		contex.builder = sandbox.app.resolve(VoteBuilder);
	});

	it("shoudl initialize data", ({ builder }) => {
		assert.instance(builder, VoteBuilder);

		const data = {
			amount: BigNumber.ZERO,
			asset: { unvotes: [], votes: [] },
			recipientId: undefined,
			senderPublicKey: undefined,
			type: VoteTransaction.type,
			typeGroup: VoteTransaction.typeGroup,
		};

		for (const [key, value] of Object.entries(data)) {
			assert.equal(builder.data[key], value);
		}
	});

	it("votesAsset - should set votes", ({ builder }) => {
		assert.equal(builder.data.asset, { unvotes: [], votes: [] });

		builder.votesAsset(["votePublicKey"]);

		assert.equal(builder.data.asset, { unvotes: [], votes: ["votePublicKey"] });
	});

	it("unvotesAsset - should set unvotes", ({ builder }) => {
		assert.equal(builder.data.asset, { unvotes: [], votes: [] });

		builder.unvotesAsset(["votePublicKey"]);

		assert.equal(builder.data.asset, { unvotes: ["votePublicKey"], votes: [] });
	});
});
