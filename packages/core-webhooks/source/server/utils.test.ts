import { Enums } from "@arkecosystem/core-kernel";
import { notFound } from "@hapi/boom";

import { describe } from "../../../core-test-framework";
import { Webhook } from "../interfaces";
import { respondWithResource } from "./utils";

describe("Utils", ({ it, assert }) => {
	const data: Webhook = {
		conditions: [
			{
				condition: "eq",
				key: "generatorPublicKey",
				value: "test-generator",
			},
			{
				condition: "gte",
				key: "fee",
				value: "123",
			},
		],
		enabled: true,
		event: Enums.BlockEvent.Forged,
		id: "dummy_id",
		target: "https://httpbin.org/post",
		token: "ark",
	};

	it("respondWithResource should return transformed resource", () => {
		assert.equal(respondWithResource(data), { data: data });
	});

	it("respondWithResource should return not found", () => {
		assert.equal(respondWithResource(), notFound());
	});
});
