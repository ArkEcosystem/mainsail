import { Identifiers } from "@mainsail/constants";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as keyPairBlsSchemas } from "@mainsail/crypto-key-pair-bls12-381";
import { schemas as signatureBlsSchemas } from "@mainsail/crypto-signature-bls12-381";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	Proposal,
	ProposalWithValidRound,
	ProposalWithLockProof,
	ProposalWithLockProofAndValidRound,
	lockProof,
} from "../test/fixtures/index.js";
import { schemas } from "./schemas";
import { signature } from "../test/fixtures/proposal.js";
import { numberArray } from "@mainsail/utils";

describe<{
	app: Application;
	validator: Validator;
	configuration: Configuration;
}>("Schemas", ({ it, assert, beforeEach, spy }) => {
	const proposals = [Proposal, ProposalWithValidRound, ProposalWithLockProof, ProposalWithLockProofAndValidRound];

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.configuration = context.app.get<Configuration>(Identifiers.Cryptography.Configuration);
		context.configuration.setConfig(cryptoJson);
		context.configuration.setHeight(1);

		context.validator = context.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.configuration),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...baseSchemas,
			...blockSchemas,
			...keyPairBlsSchemas,
			...signatureBlsSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("proposalUnsigned - should be ok", ({ validator }) => {
		for (const { proposalDataSerializableUnsigned } of proposals) {
			const result = validator.validate("proposalUnsigned", proposalDataSerializableUnsigned);
			assert.undefined(result.error);
		}
	});

	it("proposalUnsigned - should not allow additional fields", ({ validator }) => {
		const proposalCopy = { ...Proposal.proposalDataSerializableUnsigned, extraField: "extraValue" };
		const result = validator.validate("proposalUnsigned", proposalCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("proposal - should be ok", ({ validator }) => {
		for (const { proposalDataSerializable } of proposals) {
			const result = validator.validate("proposal", proposalDataSerializable);
			assert.undefined(result.error);
		}
	});

	it("proposal - should not allow additional fields", ({ validator }) => {
		const proposalCopy = { ...Proposal.proposalDataSerializable, extraField: "extraValue" };
		const result = validator.validate("proposal", proposalCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("proposal - should not allow missing properties except [validRound]", ({ validator }) => {
		const requiredKeys = Object.keys(schemas.proposal.properties).filter((key) => key !== "validRound");
		for (let key of requiredKeys) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, [key]: undefined };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	it("proposal - round should be ok", ({ validator }) => {
		const validRounds = [0, 1, 10, 100, 1000];
		for (let round of validRounds) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, round };
			const result = validator.validate("proposal", proposalCopy);
			assert.undefined(result.error);
		}

		const invalidRounds = [-1, -10, 1.5, "1", null, undefined];
		for (let round of invalidRounds) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, round };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("round"));
		}
	});

	it("proposal - validRound should be ok", ({ validator }) => {
		const valid = [0, 1, 10, 100, 1000, undefined];
		for (let validRound of valid) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, validRound };
			const result = validator.validate("proposal", proposalCopy);
			assert.undefined(result.error);
		}

		const invalid = [-1, -10, 1.5, "1", null, {}, []];
		for (let validRound of invalid) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, validRound };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("validRound"));
		}
	});

	it("proposal - validatorIndex should be ok", ({ validator }) => {
		const valid = [0, 1, 10, 52];
		for (let validatorIndex of valid) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, validatorIndex };
			const result = validator.validate("proposal", proposalCopy);
			assert.undefined(result.error);
		}

		const invalid = [-1, -10, 1.5, "1", null, {}, [], 53];
		for (let validatorIndex of invalid) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, validatorIndex };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("validatorIndex"));
		}
	});

	it("proposal - payloadSerialized should be ok", ({ validator }) => {
		const valid = ["0", "00", "0123456789abcdef"];
		for (let payloadSerialized of valid) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, payloadSerialized };
			const result = validator.validate("proposal", proposalCopy);
			assert.undefined(result.error);
		}

		const invalidPayloads = ["", "A", {}, [], null, undefined];
		for (let payloadSerialized of invalidPayloads) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, payloadSerialized };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("payloadSerialized"));
		}
	});

	it("proposal - signature should be ok", ({ validator }) => {
		for (let char of "0123456789abcdef") {
			const proposalCopy = { ...Proposal.proposalDataSerializable, signature: char.repeat(192) };
			const result = validator.validate("proposal", proposalCopy);
			assert.undefined(result.error);
		}

		const invalidSignatures = [
			"0".repeat(191),
			"0".repeat(193),
			"g".repeat(192),
			"0".repeat(191) + "g",
			...["A", "B", "C", "D", "E", "F"].map((char) => char.repeat(192)),
		];
		for (let signature of invalidSignatures) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, signature };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("signature"));
		}
	});

	it("lockProof - should be ok", ({ validator }) => {
		const result = validator.validate("lockProof", { ...lockProof, number: 1 });
		assert.undefined(result.error);
	});

	it("lockProof - all fields are required (except number)", ({ validator }) => {
		const keys = Object.keys(schemas.lockProof.properties);
		for (let key of keys) {
			if (key === "number") continue;
			const lockProofCopy = { ...lockProof, [key]: undefined, number: 1 };
			const result = validator.validate("lockProof", lockProofCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	it("lockProof - should not allow additional fields", ({ validator }) => {
		const lockProofCopy = { ...lockProof, extraField: "extraValue", number: 1 };
		const result = validator.validate("lockProof", lockProofCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("lockProof - signature should be ok", ({ validator }) => {
		for (let char of "0123456789abcdef") {
			const result = validator.validate("lockProof", {
				number: 1,
				signature: char.repeat(192),
				validators: Array(53).fill(true),
			});
			assert.undefined(result.error);
		}

		const invalidSignatures = [
			"0".repeat(191),
			"0".repeat(193),
			"g".repeat(192),
			"0".repeat(191) + "g",
			...["A", "B", "C", "D", "E", "F"].map((char) => char.repeat(192)),
		];
		for (let signature of invalidSignatures) {
			const result = validator.validate("lockProof", {
				signature,
				validators: Array(53).fill(true),
				number: 1,
			});
			assert.defined(result.error);
			assert.true(result.error!.includes("signature"));
		}
	});

	it("lockProof - validators should be ok", ({ validator }) => {
		const NUMBER_OF_VALIDATORS = 53;

		const validValidators = [
			Array(NUMBER_OF_VALIDATORS).fill(true),
			Array(NUMBER_OF_VALIDATORS).fill(false),
			[...Array(20).fill(true), ...Array(33).fill(false)],
		];

		for (let validators of validValidators) {
			const result = validator.validate("lockProof", {
				number: 1,
				signature,
				validators,
			});
			assert.undefined(result.error);
		}

		const invalidValidators = [
			Array(NUMBER_OF_VALIDATORS - 1).fill(true),
			Array(NUMBER_OF_VALIDATORS + 1).fill(true),
			Array(NUMBER_OF_VALIDATORS).fill(1),
			Array(NUMBER_OF_VALIDATORS).fill(0),
			Array(NUMBER_OF_VALIDATORS).fill(undefined),
			Array(NUMBER_OF_VALIDATORS).fill("a"),
			Array(NUMBER_OF_VALIDATORS).fill({}),
			Array(NUMBER_OF_VALIDATORS).fill(null),
		];
		for (let validators of invalidValidators) {
			const result = validator.validate("lockProof", {
				signature,
				validators,
				number: 1,
			});
			assert.defined(result.error);
			assert.true(result.error!.includes("validators"));
		}
	});

	it("proposalUnsigned - should correctly deserialize block number from payloadSerialized", ({
		validator,
		configuration,
	}) => {
		const spyConfigurationGetMilestone = spy(configuration, "getMilestone");

		const result = validator.validate("proposalUnsigned", Proposal.proposalDataSerializableUnsigned);
		assert.undefined(result.error);

		spyConfigurationGetMilestone.calledOnce();
		spyConfigurationGetMilestone.calledWith(2);
	});

	it("lockProof - should correctly parse block number from number", ({ validator, configuration }) => {
		const spyConfigurationGetMilestone = spy(configuration, "getMilestone");

		const result = validator.validate("lockProof", { ...lockProof, number: 3 });
		assert.undefined(result.error);

		spyConfigurationGetMilestone.calledOnce();
		spyConfigurationGetMilestone.calledWith(3);
	});
});
