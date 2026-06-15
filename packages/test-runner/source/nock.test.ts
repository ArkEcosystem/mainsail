import { describe } from "./describe";

describe("nock", ({ assert, it, nock }) => {
	it("fake - should intercept requests to any host by default", async () => {
		nock.fake().get("/hello").reply(200, { hello: "world" });

		const response = await fetch("http://any-host.test/hello");

		assert.is(response.status, 200);
		assert.equal(await response.json(), { hello: "world" });
	});

	it("fake - should intercept requests to the given host", async () => {
		nock.fake("http://specific-host.test").get("/status").reply(201);

		const response = await fetch("http://specific-host.test/status");

		assert.is(response.status, 201);
	});

	it("should block requests that are not intercepted while a suite runs", async () => {
		await assert.rejects(() => fetch("http://not-intercepted.test/"));
	});
});
