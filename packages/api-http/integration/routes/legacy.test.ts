import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import legacyColdWallets from "../../test/fixtures/legacy_cold_wallets.json";

describe<{
	app: Application;
}>("Legacy", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	let options = {};

	beforeAll(async (context) => {
		nock.enableNetConnect();
		apiContext = await prepareSandbox(context);
	});

	afterAll((context) => {
		nock.disableNetConnect();
		apiContext.dispose();
	});

	beforeEach(async (context) => {
		await apiContext.reset();
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/legacy/cold-wallets", async () => {
		await apiContext.legacyColdWalletRepository.save(legacyColdWallets);

		const { statusCode, data } = await request("/legacy/cold-wallets", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, legacyColdWallets);
	});

	it("/legacy/cold-wallets/{address}", async () => {
		await apiContext.legacyColdWalletRepository.save(legacyColdWallets);

		const wallet = legacyColdWallets[0];

		const {
			statusCode,
			data: { data },
		} = await request(`/legacy/cold-wallets/${wallet.address}`, options);

		assert.equal(statusCode, 200);
		assert.equal(data, wallet);
	});

	it("/legacy/cold-wallets/{address} (404)", async () => {
		await apiContext.legacyColdWalletRepository.save(legacyColdWallets);

		const fake = "1".repeat(34);

		await assert.rejects(
			async () => request(`/legacy/cold-wallets/${fake}`, options),
			"Request failed with status code 404",
		);
	});
});
