import { describe } from "@mainsail/test-runner";

import { makeBlock, makePeer, makeState, makeTransaction, makeWallet } from "../../test/fixtures/entities";
import { ApiNodeResource } from "./api-node.js";
import { BlockResource } from "./block.js";
import { LegacyColdWalletResource } from "./legacy-cold-wallet.js";
import { PeerResource } from "./peer.js";
import { ReceiptResource } from "./receipt.js";
import { RoundResource } from "./round.js";
import { TokenHolderResource } from "./token-holder.js";
import { TokenTransferResource } from "./token-transfer.js";
import { TokenWhitelistResource } from "./token-whitelist.js";
import { TokenResource } from "./token.js";
import { TransactionResource } from "./transaction.js";
import { ValidatorRoundResource } from "./validator-round.js";
import { ValidatorResource } from "./validator.js";
import { WalletResource } from "./wallet.js";

describe("Resources", ({ it, assert }) => {
	it("identity resources return the input from raw and transform", () => {
		const entity = { marker: "entity" };

		for (const Resource of [
			ApiNodeResource,
			LegacyColdWalletResource,
			TokenHolderResource,
			TokenTransferResource,
			TokenWhitelistResource,
			TokenResource,
			ValidatorRoundResource,
			ValidatorResource,
			WalletResource,
		]) {
			const resource = new Resource();

			assert.is(resource.raw(entity as any), entity);
			assert.is(resource.transform(entity as any), entity);
		}
	});

	it("RoundResource picks address and votes", () => {
		const resource = new RoundResource();
		const round = { address: "0xa", extra: true, votes: "100" };

		assert.is(resource.raw(round as any), round);
		assert.equal(resource.transform(round as any), { address: "0xa", votes: "100" });
	});

	it("PeerResource picks the public peer fields", () => {
		const resource = new PeerResource();
		const peer = { ...makePeer(), secret: "internal" };

		assert.is(resource.raw(peer as any), peer);

		const transformed = resource.transform(peer as any) as any;
		assert.equal(transformed.ip, "127.0.0.1");
		assert.false("secret" in transformed);
	});

	it("ReceiptResource maps a transaction to its receipt for raw and transform", () => {
		const resource = new ReceiptResource();
		const transaction = makeTransaction({ decodedError: "reverted" });

		for (const receipt of [
			resource.raw(transaction as any) as any,
			resource.transform(transaction as any) as any,
		]) {
			assert.equal(receipt.transactionHash, transaction.hash);
			assert.equal(receipt.decodedError, "reverted");
			assert.false("hash" in receipt);
		}
	});

	it("ReceiptResource omits the decoded error of successful transactions", () => {
		const resource = new ReceiptResource();

		assert.false("decodedError" in (resource.transform(makeTransaction() as any) as any));
	});

	it("BlockResource strips the enrichment from raw", () => {
		const resource = new BlockResource();
		const enriched = { ...makeBlock(), generator: makeWallet(), state: makeState() };

		const raw = resource.raw(enriched as any) as any;
		assert.undefined(raw.generator);
		assert.undefined(raw.state);
		assert.equal(raw.hash, enriched.hash);
	});

	it("BlockResource derives confirmations, total and generator fields", () => {
		const resource = new BlockResource();
		const enriched = { ...makeBlock(), generator: makeWallet(), state: makeState({ blockNumber: "100" }) };

		const transformed = resource.transform(enriched as any) as any;
		assert.equal(transformed.confirmations, 10);
		assert.equal(transformed.total, "300");
		assert.equal(transformed.username, "genesis");

		// A zero state height yields zero confirmations instead of a negative count.
		const fresh = resource.transform({ ...enriched, state: makeState({ blockNumber: "0" }) } as any) as any;
		assert.equal(fresh.confirmations, 0);
	});

	it("TransactionResource strips the state from raw", () => {
		const resource = new TransactionResource();
		const enriched = { ...makeTransaction(), fullReceipt: false, state: makeState() };

		const raw = resource.raw(enriched as any) as any;
		assert.undefined(raw.state);
		assert.equal(raw.hash, enriched.hash);
	});

	it("TransactionResource omits confirmations and timestamp for pending transactions", async () => {
		const resource = new TransactionResource();
		const pending = {
			...makeTransaction({ blockNumber: undefined, timestamp: undefined }),
			fullReceipt: false,
			state: makeState(),
		};

		const transformed = (await resource.transform(pending as any)) as any;
		assert.undefined(transformed.confirmations);
		assert.undefined(transformed.timestamp);
	});

	it("TransactionResource keeps the legacy second signature only when present", async () => {
		const resource = new TransactionResource();
		const enriched = {
			...makeTransaction({ legacySecondSignature: "aa".repeat(64) }),
			fullReceipt: false,
			state: makeState(),
		};

		const transformed = (await resource.transform(enriched as any)) as any;
		assert.equal(transformed.legacySecondSignature, "aa".repeat(64));

		const withoutSignature = (await resource.transform({
			...makeTransaction(),
			fullReceipt: false,
			state: makeState(),
		} as any)) as any;
		assert.false("legacySecondSignature" in withoutSignature);
	});
});
