import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import wallets from "../../test/fixtures/wallets.json";
import transactions from "../../test/fixtures/transactions.json";
import walletTransactions from "../../test/fixtures/wallet_transactions.json";
import walletTransactionsResponse from "../../test/fixtures/wallet_transactions.response.json";
import multiPayments from "../../test/fixtures/multi_payments.json";
import multiPaymentTransactions from "../../test/fixtures/multi_payments.transactions.json";
import multiPaymentWallets from "../../test/fixtures/multi_payments.wallets.json";
import multiPaymentTransactionsResponse from "../../test/fixtures/multi_payments.transactions.response.json";
import tokens from "../../test/fixtures/tokens.json";
import tokenActions from "../../test/fixtures/token_actions.json";
import tokenHolders from "../../test/fixtures/token_holders.json";
import tokenWhitelist from "../../test/fixtures/token_whitelist.json";
import tokenTransferTransactions from "../../test/fixtures/token_transfer.transactions.json";
import walletsTokens from "../../test/fixtures/wallets_tokens.json";
import walletTokensResponse from "../../test/fixtures/wallet_tokens.response.json";
import walletTokenHoldersResponse from "../../test/fixtures/wallet_token_holders.response.json";
import walletActivitiesResponse from "../../test/fixtures/wallets_activity.response.json";

describe<{
	app: Application;
}>("Wallets", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/wallets", async () => {
		await apiContext.walletRepository.save(wallets);

		const { statusCode, data } = await request("/wallets", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data.length, wallets.length);
	});

	it("/wallets?attributes", async () => {
		await apiContext.walletRepository.save(wallets);

		const testCases = [
			{
				path: "attributes.validatorPublicKey=9283a37556aa42aa7e2ee363fdd63adb8e91d2a97fe61c55a298075f4075471762371209f190d6d1f674b882e039b78b",
				result: wallets.filter(
					(w) =>
						w.attributes.validatorPublicKey ===
						"9283a37556aa42aa7e2ee363fdd63adb8e91d2a97fe61c55a298075f4075471762371209f190d6d1f674b882e039b78b",
				),
			},
			{
				path: "attributes.validatorLastBlock.number=3",
				result: wallets.filter((w) => w.attributes.validatorLastBlock?.number === 3),
			},
			{
				path: "attributes.validatorProducedBlocks.from=1",
				result: wallets.filter((w) => w.attributes.validatorProducedBlocks! >= 1),
			},
			{
				path: "attributes.validatorProducedBlocks.from=1&attributes.validatorProducedBlocks.to=1",
				result: wallets.filter((w) => w.attributes.validatorProducedBlocks === 1),
			},
			{
				path: "attributes.validatorProducedBlocks.from=999",
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(`/wallets?${path}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data.length, result.length);
			assert.equal(data.data, result);
		}
	});

	it("/wallets?attributes rejects SQL injection in attribute keys", async () => {
		await apiContext.walletRepository.save(wallets);

		// Control: a legitimate attribute filter still works.
		const legit = await request("/wallets?attributes.validatorProducedBlocks.from=1", options);
		assert.equal(legit.statusCode, 200);

		// Each payload places SQL metacharacters in the jsonb attribute KEY — the injectable position.
		// They are rejected before any query is built/run without breaking out
		// of the quoted jsonb path literal (blind exfiltration / pg_sleep DoS / stacked statements).
		const injectionPaths = [
			`/wallets?attributes.${encodeURIComponent("a'||pg_sleep(3)||'b")}=1`, // timing / boolean-blind
			`/wallets?attributes.${encodeURIComponent("x'; DROP TABLE wallets; --")}=1`, // stacked statement
			`/wallets?attributes.${encodeURIComponent("x') UNION SELECT 1 --")}=1`, // union
			`/wallets?attributes.${encodeURIComponent("x\\'")}=1`, // backslash+quote (SCS=off breakout)
			`/wallets?attributes.validatorLastBlock.${encodeURIComponent("n')::bigint--")}=1`, // nested key
		];

		for (const path of injectionPaths) {
			let statusCode;
			try {
				statusCode = (await request(path, options)).statusCode; // must never be a 2xx
			} catch (ex) {
				statusCode = ex.response?.statusCode;
			}

			// Rejected as a client error (bad request), not accepted and not a server error.
			assert.equal(statusCode, 400);
		}

		// The DB is intact and still queryable after the injection attempts (nothing was dropped/altered).
		const after = await request("/wallets", options);
		assert.equal(after.statusCode, 200);
		assert.equal(after.data.data.length, wallets.length);
	});

	it("/wallets/top", async () => {
		await apiContext.walletRepository.save(wallets);

		const { statusCode, data } = await request("/wallets/top", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data.length, wallets.length);
	});

	it("/wallets/{id}", async () => {
		await apiContext.walletRepository.save(wallets);

		const wallet = wallets[0];

		const testCases = [
			{
				id: wallet.address,
				result: { ...wallet },
			},
			{
				id: wallet.publicKey,
				result: { ...wallet },
			},
			// {
			// 	id: wallet.attributes.username,
			// 	result: wallet,
			// },
		];

		for (const { id, result } of testCases) {
			const {
				statusCode,
				data: { data },
			} = await request(`/wallets/${id}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});

	it("/wallets?orderBy", async () => {
		await apiContext.walletRepository.save(wallets);
		const testCases = [
			{
				path: "/wallets?orderBy=attributes.validatorRank:asc",
				result: [...wallets].sort(
					(a, b) => Number(a.attributes.validatorRank) - Number(b.attributes.validatorRank),
				),
			},
			{
				path: "/wallets?limit=2&orderBy=attributes.validatorRank:desc",
				result: [...wallets]
					.sort((a, b) => Number(b.attributes.validatorRank) - Number(a.attributes.validatorRank))
					.slice(0, 2),
			},
			{
				path: "/wallets?limit=15&orderBy=attributes.validatorLastBlock.number:asc",
				result: [...wallets]
					.sort(
						(a, b) =>
							Number(a.attributes.validatorLastBlock?.number) -
							Number(b.attributes.validatorLastBlock?.number),
					)
					.slice(0, 15),
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets?orderBy rejects SQL injection in the sort field", async () => {
		await apiContext.walletRepository.save(wallets);

		// The sort field also feeds QueryHelper.getColumnName/escapeLiteral, so it must be rejected
		// before it reaches the query builder. The orderBy schema (a stricter [.a-z] property guard)
		// catches it at request validation, which surfaces as 422 rather than the 400 the attribute
		// allowlist returns — either way it is a client error, never executed.
		const injectionPaths = [
			`/wallets?orderBy=attributes.${encodeURIComponent("a'||pg_sleep(3)||'b")}:asc`,
			`/wallets?orderBy=${encodeURIComponent("attributes.x'); DROP TABLE wallets; --")}:asc`,
		];

		for (const path of injectionPaths) {
			let statusCode;
			try {
				statusCode = (await request(path, options)).statusCode; // must never be a 2xx
			} catch (ex) {
				statusCode = ex.response?.statusCode;
			}

			assert.equal(statusCode, 422);
		}

		// A legitimate sort still works.
		const after = await request("/wallets?orderBy=attributes.validatorRank:asc", options);
		assert.equal(after.statusCode, 200);
	});

	it("/wallets/{id}/transactions", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(transactions);

		const wallet = wallets[0];

		let { statusCode, data } = await request(`/wallets/${wallet.address}/transactions`, options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(walletTransactions);

		({ statusCode, data } = await request(`/wallets/${wallet.address}/transactions`, options));
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactionsResponse.slice(1));
	});

	it("/wallets/{id}/transactions/sent", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(walletTransactions);

		const wallet = wallets[0];

		const { statusCode, data } = await request(`/wallets/${wallet.address}/transactions/sent`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactionsResponse.slice(1));
	});

	it("/wallets/{id}/transactions/received", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(walletTransactions);

		const recipient = wallets[wallets.length - 2].address;

		const { statusCode, data } = await request(`/wallets/${recipient}/transactions/received`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactionsResponse);
	});

	it("/wallets/{id}/transactions (with multipayments)", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(transactions);
		await apiContext.walletRepository.save(multiPaymentWallets);

		const senderWallet = multiPaymentWallets[0];
		const recipientWallet1 = multiPaymentWallets[1];
		const recipientWallet2 = multiPaymentWallets[2];

		let { statusCode, data } = await request(`/wallets/${recipientWallet1.address}/transactions`, options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(multiPaymentTransactions);
		await apiContext.multiPaymentRepository.save(multiPayments);

		for (const wallet of [senderWallet, recipientWallet1, recipientWallet2]) {
			({ statusCode, data } = await request(`/wallets/${wallet.address}/transactions`, options));

			assert.equal(statusCode, 200);
			assert.equal(data.data, multiPaymentTransactionsResponse);
		}
	});

	it("/wallets/{id}/transactions/received (with multipayments)", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(transactions);
		await apiContext.walletRepository.save(multiPaymentWallets);

		const senderWallet = multiPaymentWallets[0];
		const recipientWallet1 = multiPaymentWallets[1];
		const recipientWallet2 = multiPaymentWallets[2];

		let { statusCode, data } = await request(`/wallets/${recipientWallet1.address}/transactions/received`, options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(multiPaymentTransactions);
		await apiContext.multiPaymentRepository.save(multiPayments);

		({ statusCode, data } = await request(`/wallets/${recipientWallet1.address}/transactions/received`, options));

		assert.equal(statusCode, 200);
		assert.equal(data.data, multiPaymentTransactionsResponse);

		({ statusCode, data } = await request(`/wallets/${recipientWallet2.address}/transactions/received`, options));

		assert.equal(statusCode, 200);
		assert.equal(data.data, multiPaymentTransactionsResponse);

		({ statusCode, data } = await request(`/wallets/${senderWallet.address}/transactions/received`, options));

		assert.equal(statusCode, 200);
		assert.empty(data.data);
	});

	it("/wallets/{}/tokens", async () => {
		await apiContext.walletRepository.save(walletsTokens);
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				path: `/wallets/${walletsTokens[0].address}/tokens`,
				result: walletTokensResponse,
			},
			{
				path: "/wallets/tokens?addresses=0x0000000000000000000000000000000000000000",
				result: [],
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?minBalance=99999850`,
				result: walletTokensResponse,
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?minBalance=99999851`,
				result: [walletTokensResponse[1]],
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?minBalance=100000000`,
				result: [walletTokensResponse[1]],
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?minBalance=100000001`,
				result: [],
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?minBalance=2`,
				result: walletTokensResponse,
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?tokenAddress=0x0ba3d7cba9701f76f6285733a5a877a557c86034`,
				result: [walletTokensResponse[0]],
			},
			{
				path: `/wallets/${walletsTokens[0].address}/tokens?tokenAddress=0x1ba3d7cba9701f76f6285733a5a877a557c86034`,
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/activity", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenActionRepository.save(tokenActions);
		await apiContext.transactionRepository.save(tokenTransferTransactions);
		await apiContext.walletRepository.save(wallets);

		const testCases = [
			{
				path: `/wallets/activity?addresses=${transactions[0].from}`,
				result: [walletActivitiesResponse[0]],
			},
			{
				path: `/wallets/activity?addresses=${tokenActions[0].address}`,
				result: [walletActivitiesResponse[1]],
			},
			{
				path: `/wallets/activity?addresses=${transactions[0].from},${tokenActions[0].address}`,
				result: [walletActivitiesResponse[0], walletActivitiesResponse[1]],
			},
			{
				path: `/wallets/activity?&addresses=${transactions[0].to}`,
				result: walletActivitiesResponse.slice(2),
			},
			{
				path: `/wallets/activity?&addresses=${transactions[0].to}&offset=100`,
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?addresses", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				path: "/wallets/tokens?addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse,
			},
			{
				path: "/wallets/tokens?addresses=0x0000000000000000000000000000000000000000",
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?addresses&names", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const path =
			"/wallets/tokens?addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7";

		const testCases = [
			{
				path: `${path}&name=DARK20`,
				result: [walletTokenHoldersResponse[0]],
			},
			{
				path: `${path}&name=ARK`,
				result: walletTokenHoldersResponse,
			},
			{
				path: `${path}&name=!!`,
				result: [walletTokenHoldersResponse[1]],
			},
			{
				path: `${path}&name=ETH`,
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?addresses&minBalance", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const path =
			"/wallets/tokens?addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7";

		const testCases = [
			{
				path: `${path}&minBalance=0`,
				result: walletTokenHoldersResponse,
			},
			{
				path: `${path}&minBalance=0.01`,
				result: walletTokenHoldersResponse,
			},
			{
				path: `${path}&minBalance=100000001`,
				result: [],
			},
			{
				path: `${path}&minBalance=100000000`,
				result: walletTokenHoldersResponse.slice(1),
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens pagination", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				path: "/wallets/tokens?limit=1&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse.slice(0, 1),
			},
			{
				path: "/wallets/tokens?limit=10&offset=1&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse.slice(1, 3),
			},
			{
				path: "/wallets/tokens?limit=10&offset=2&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse.slice(2, 4),
			},
			{
				path: "/wallets/tokens?limit=5&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse,
			},
			{
				path: "/wallets/tokens?offset=5&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?ignoreWhitelist", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);

		const testCases = [
			{
				path: "/wallets/tokens?ignoreWhitelist=true&limit=5&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse,
			},
			{
				path: "/wallets/tokens?ignoreWhitelist=false&limit=5&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: [],
			},
			{
				path: "/wallets/tokens?limit=5&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?whitelist=", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist.slice(1, 2));

		const testCases = [
			{
				path: "/wallets/tokens?addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: [walletTokenHoldersResponse[2]],
			},
			{
				path: `/wallets/tokens?whitelist=${tokens[0].address}&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7`,
				result: [walletTokenHoldersResponse[0], walletTokenHoldersResponse[2]],
			},
			{
				path: `/wallets/tokens?whitelist=${tokens.map((t) => t.address).join(",")}&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7`,
				result: walletTokenHoldersResponse,
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, { ...options });
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/wallets/tokens?blacklist=", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				// All
				path: "/wallets/tokens?addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7",
				result: walletTokenHoldersResponse,
			},
			{
				// Blacklist first token
				path: `/wallets/tokens?blacklist=${tokens[0].address}&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7`,
				result: [walletTokenHoldersResponse[1], walletTokenHoldersResponse[2]],
			},
			{
				// Blacklist all
				path: `/wallets/tokens?blacklist=${tokens.map((t) => t.address).join(",")}&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7`,
				result: [],
			},
			{
				// Blacklist takes precendence if whitelist overlaps
				path: `/wallets/tokens?blacklist=${tokens.map((t) => t.address).join(",")}&whitelist=${tokens.map((t) => t.address).join(",")}&addresses=0x8233F6Df6449D7655f4643D2E752DC8D2283fAd5,0x432b093d9542B905C87587607491C369408475b4,0x3949B5aEb77059945e96c513F8F712450Ca89Eb7`,
				result: [],
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, { ...options });
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});
});
