import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { Configuration } from "../../../crypto-config";
import { describe, Sandbox } from "../../../test-framework/source";
import { calculateApproval, getMilestonesWhichAffectActiveValidatorCount } from "./calculate-forging-info";
import { BigNumber } from "@mainsail/utils";

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("getMilestonesWhichAffectActiveDelegateCount", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
	});

	it("should return milestones which changes delegate count", ({ configuration }) => {
		configuration.setConfig({
			...crypto,
			milestones: [{ activeValidators: 4, height: 1 }],
		});

		const milestones = [
			{ activeValidators: 4, height: 0 },
			{ activeValidators: 4, height: 1 },
			{ activeValidators: 4, height: 5 },
			{ activeValidators: 8, height: 9 },
			{ activeValidators: 8, height: 15 },
		];

		const config = { ...crypto, milestones };
		configuration.setConfig({ ...crypto, milestones: milestones });

		assert.length(getMilestonesWhichAffectActiveValidatorCount(configuration), 2);
	});
});

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("calculateApproval", ({ assert, it }) => {
	const toBalance = (n: number) => BigNumber.SATOSHI.times(n);
	const totalSupply = BigNumber.make(toBalance(1000000));

	it("should calculate correctly", () => {
		const voteBalance = toBalance(10000);
		const approval = calculateApproval(voteBalance, totalSupply);
		assert.equal(approval, 1.0);
	});

	it("should calculate correctly with 2 decimals", () => {
		const voteBalance = toBalance(16500);
		const approval = calculateApproval(voteBalance, totalSupply);
		assert.equal(approval, 1.65);
	});

	it("should calculate correctly when vote balance is 0", () => {
		const voteBalance = toBalance(0);
		const approval = calculateApproval(voteBalance, totalSupply);
		assert.equal(approval, 0);
	});
});
