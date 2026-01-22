import { describe, Sandbox } from "@mainsail/test-framework";
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
import tokenHolders from "../../test/fixtures/token_holders.json";
import walletsTokens from "../../test/fixtures/wallets_tokens.json";
import walletTokensResponse from "../../test/fixtures/wallet_tokens.response.json";
import walletTokenHoldersResponse from "../../test/fixtures/wallet_token_holders.response.json";

describe<{
	sandbox: Sandbox;
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

		const testCases = [
			{
				path: `/wallets/${walletsTokens[0].address}/tokens`,
				result: walletTokensResponse,
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

	it("/wallets/tokens?addresses", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);

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

	it("/wallets/tokens pagination", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);

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

	it("/wallets returns token count", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);

		const wallet = wallets[0];
		const tokenWallet = wallets.find((w) => w.address === tokenHolders[2].address);

		const testCases = [
			{
				id: wallet.address,
				result: { ...wallet, tokenCount: 0 },
			},
			{
				id: tokenWallet!.address,
				result: { ...tokenWallet, tokenCount: 1 },
			},
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
});
