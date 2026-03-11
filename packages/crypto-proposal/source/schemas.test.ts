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

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const proposals = [Proposal, ProposalWithValidRound, ProposalWithLockProof, ProposalWithLockProofAndValidRound];

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		context.validator = context.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
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

	it("proposal - data should not allow additional fields", ({ validator }) => {
		const proposalCopy = { ...Proposal.proposalDataSerializable, data: { ...Proposal.proposalDataSerializable.data, extraField: "extraValue" } };
		const result = validator.validate("proposal", proposalCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("proposal - should not allow missing properties except [validRound]", ({ validator }) => {
		const requiredKeys = Object.keys(schemas.proposal.properties).filter(key => key !== "validRound");
		for(let key of requiredKeys) {
			const proposalCopy = { ...Proposal.proposalDataSerializable, [key]: undefined };
			const result = validator.validate("proposal", proposalCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	// TODO: Check same for data

	it("lockProof - should be ok", ({ validator }) => {
		const result = validator.validate("lockProof", lockProof);
		assert.undefined(result.error);
	});

	it("lockProof - all fields are required", ({ validator }) => {
		const keys = Object.keys(schemas.lockProof.properties);
		for(let key of keys) {
			const lockProofCopy = { ...lockProof, [key]: undefined };
			const result = validator.validate("lockProof", lockProofCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	it("lockProof - should not allow additional fields", ({ validator }) => {
		const lockProofCopy = { ...lockProof, extraField: "extraValue" };
		const result = validator.validate("lockProof", lockProofCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});


	it("lockProof - signature should be ok", ({ validator }) => {
		for(let char of "0123456789abcdef") {
			const result = validator.validate("lockProof", {
				signature: char.repeat(192),
				validators: Array(53).fill(true),
			});
			assert.undefined(result.error);
		}

		const invalidSignatures = ["0".repeat(191), "0".repeat(193), "g".repeat(192), "0".repeat(191) + "g", ...(["A", "B", "C", "D", "E", "F"].map(char => char.repeat(192)))];
		for(let signature of invalidSignatures) {
			const result = validator.validate("lockProof", {
				signature,
				validators: Array(53).fill(true),
			});
			assert.defined(result.error);
			assert.true(result.error!.includes("signature"));
		}
	});

	it("lockProof - validators should be ok", ({ validator }) => {
		const NUMBER_OF_VALIDATORS = 53;

		const validValidators = [Array(NUMBER_OF_VALIDATORS).fill(true), Array(NUMBER_OF_VALIDATORS).fill(false), [...Array(20).fill(true), ...Array(33).fill(false)]];

		for(let validators of validValidators) {
			const result = validator.validate("lockProof", {
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
			Array(NUMBER_OF_VALIDATORS).fill(null)
		];
		for(let validators of invalidValidators) {
			const result = validator.validate("lockProof", {
				signature,
				validators,
			});
			assert.defined(result.error);
			assert.true(result.error!.includes("validators"));
		}
	});
});
