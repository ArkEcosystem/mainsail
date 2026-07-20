import { describe } from "@mainsail/test-runner";

import { ADDRESS_A, ADDRESS_B, makeValidatorRound } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("ValidatorRounds routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/rounds - returns rounds in a pagination envelope", async ({ server, repos }) => {
		repos.validatorRound.data.manyAndCount = [[makeValidatorRound()], 5];

		const response = await server.inject({ method: "GET", url: "/api/rounds" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 5);
		assert.equal(body.data[0].round, 1);

		// Latest rounds first, windowed by the query pagination defaults.
		assert.equal(repos.validatorRound.qb.calls.addOrderBy, [["round", "DESC"]]);
		assert.equal(repos.validatorRound.qb.calls.offset, [[0]]);
		assert.equal(repos.validatorRound.qb.calls.limit, [[100]]);
	});

	it("GET /api/rounds/{round} - returns the round", async ({ server, repos }) => {
		repos.validatorRound.data.one = makeValidatorRound();

		const response = await server.inject({ method: "GET", url: "/api/rounds/1" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.validators, [ADDRESS_A, ADDRESS_B]);
		assert.equal(repos.validatorRound.qb.calls.where, [["round = :round", { round: 1 }]]);
	});

	it("GET /api/rounds/{round} - responds 404 for an unknown round", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/rounds/99" });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/rounds/{round} - rejects a non-numeric round", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/rounds/nope" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/rounds/{id}/validators - pairs validators with their votes", async ({ server, repos }) => {
		repos.validatorRound.data.one = makeValidatorRound({
			validators: [ADDRESS_A, ADDRESS_B],
			votes: ["100"], // fewer votes than validators
		});

		const response = await server.inject({ method: "GET", url: "/api/rounds/1/validators" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, [
			{ address: ADDRESS_A, votes: "100" },
			// A missing vote entry falls back to zero.
			{ address: ADDRESS_B, votes: "0" },
		]);

		// This route reads the round from the `id` path parameter.
		assert.equal(repos.validatorRound.qb.calls.where, [["round = :round", { round: 1 }]]);
	});

	it("GET /api/rounds/{id}/validators - responds 404 for an unknown round", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/rounds/99/validators" });

		assert.is(response.statusCode, 404);
	});
});
