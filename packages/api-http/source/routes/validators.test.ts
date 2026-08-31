import { describe } from "@mainsail/test-runner";

import { ADDRESS_A, ADDRESS_B, makeBlock, makePage, makeState, makeWallet } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const makeValidator = (overrides: Record<string, unknown> = {}) =>
	makeWallet({
		attributes: { username: "validator", validatorPublicKey: "aa".repeat(48) },
		...overrides,
	});

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Validators routes", ({ it, assert, beforeEach, afterEach }) => {
	const replayBrackets = (bracket: any): any[][] => {
		const replayed: any[][] = [];
		const recorder: any = {
			orWhere: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
			where: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
		};
		bracket.whereFactory(recorder);

		return replayed;
	};

	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/validators - lists validators with schema-scoped criteria", async ({ server, repos }) => {
		repos.wallet.data.page = makePage([makeValidator()]);

		const response = await server.inject({
			method: "GET",
			url: `/api/validators?address=${ADDRESS_A}&unknownCriteria=1`,
		});

		assert.is(response.statusCode, 422); // unknown keys are rejected by the schema

		const listed = await server.inject({ method: "GET", url: `/api/validators?address=${ADDRESS_A}` });
		assert.is(listed.statusCode, 200);
		assert.is(JSON.parse(listed.payload).meta.totalCount, 1);

		// Only whitelisted criteria keys reach the repository.
		const [criteria] = repos.wallet.calls.findManyValidatorsByCritera[0];
		assert.equal(criteria, { address: [ADDRESS_A] });
	});

	it("GET /api/validators/{id} - returns the validator wallet", async ({ server, repos }) => {
		repos.wallet.data.one = makeValidator();

		const response = await server.inject({ method: "GET", url: `/api/validators/${ADDRESS_A}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.address, ADDRESS_A);

		// Unlike the wallets lookup, only wallets with a registered validator public key match.
		assert.equal(repos.wallet.qb.calls.where, [
			["attributes ? :validatorPublicKey", { validatorPublicKey: "validatorPublicKey" }],
		]);
		assert.equal(repos.wallet.qb.calls.andWhere[0], [
			"attributes->>:validatorPublicKey <> ''",
			{ validatorPublicKey: "validatorPublicKey" },
		]);
		// The id is matched against address, public key and username alternatives.
		assert.equal(replayBrackets(repos.wallet.qb.calls.andWhere[1][0]), [
			["address = :address", { address: ADDRESS_A }],
			["public_key = :publicKey", { publicKey: ADDRESS_A }],
			["attributes @> :username", { username: { username: ADDRESS_A } }],
		]);
	});

	it("GET /api/validators/{id} - responds 404 for an unknown validator", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/validators/${ADDRESS_A}` });

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "Validator not found");
	});

	it("GET /api/validators/{id}/voters - lists wallets voting for the validator", async ({ server, repos }) => {
		repos.wallet.data.one = makeValidator();
		repos.wallet.data.page = makePage([makeWallet({ address: ADDRESS_B, attributes: { vote: ADDRESS_A } })]);

		// Request by username so the vote criteria provably comes from the resolved
		// validator's address rather than from the raw path parameter.
		const response = await server.inject({ method: "GET", url: "/api/validators/validator/voters" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data[0].address, ADDRESS_B);

		// The vote attribute is forced into the criteria.
		const [criteria] = repos.wallet.calls.findManyByCriteria[0];
		assert.equal(criteria.attributes, { vote: ADDRESS_A });
	});

	it("GET /api/validators/{id}/voters - responds 404 for an unknown validator", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/validators/${ADDRESS_A}/voters` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/validators/{id}/blocks - lists enriched blocks proposed by the validator", async ({
		server,
		repos,
	}) => {
		repos.wallet.data.one = makeValidator();
		repos.block.data.page = makePage([makeBlock()]);
		repos.state.data.one = makeState({ blockNumber: "100" });

		// Request by username so the proposer criteria provably comes from the wallet's address.
		const response = await server.inject({ method: "GET", url: "/api/validators/validator/blocks" });

		assert.is(response.statusCode, 200);

		const [block] = JSON.parse(response.payload).data;
		assert.equal(block.username, "validator");
		assert.equal(block.confirmations, 10);

		// The proposer is forced into the criteria.
		const [criteria] = repos.block.calls.findManyByCriteria[0];
		assert.equal(criteria.proposer, ADDRESS_A);
	});

	it("GET /api/validators/{id}/blocks - responds 404 for a wallet without a public key", async ({
		server,
		repos,
	}) => {
		repos.wallet.data.one = makeValidator({ publicKey: undefined });

		const response = await server.inject({ method: "GET", url: `/api/validators/${ADDRESS_A}/blocks` });

		assert.is(response.statusCode, 404);
	});
});
