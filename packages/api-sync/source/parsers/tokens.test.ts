import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, encodeFunctionResult, parseAbi } from "viem";

import { TokenParserService } from "./tokens.js";

const erc20Abi = parseAbi([
	"function totalSupply() view returns (uint256)",
	"function balanceOf(address account) view returns (uint256)",
	"function name() view returns (string)",
	"function symbol() view returns (string)",
	"function decimals() view returns (uint8)",
	"event Transfer(address indexed from, address indexed to, uint256 value)",
	"event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const);

const TOKEN = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_TOKEN = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HOLDER_ONE = "0x1111111111111111111111111111111111111111";
const HOLDER_TWO = "0x2222222222222222222222222222222222222222";

const transferLog = (token: string, from: string, to: string, value: bigint) => ({
	address: token,
	data: encodeAbiParameters([{ type: "uint256" }], [value]),
	topics: encodeEventTopics({ abi: erc20Abi, args: { from, to }, eventName: "Transfer" }),
});

const approvalLog = (token: string, owner: string, spender: string, value: bigint) => ({
	address: token,
	data: encodeAbiParameters([{ type: "uint256" }], [value]),
	topics: encodeEventTopics({ abi: erc20Abi, args: { owner, spender }, eventName: "Approval" }),
});

const calldataOf = (functionName: "totalSupply" | "name" | "symbol" | "decimals"): string =>
	encodeFunctionData({ abi: erc20Abi, functionName }).slice(2);

const balanceOfCalldata = (account: `0x${string}`): string =>
	encodeFunctionData({ abi: erc20Abi, args: [account], functionName: "balanceOf" }).slice(2);

const asBuffer = (hex: `0x${string}`): Buffer => Buffer.from(hex.slice(2), "hex");

const ok = (hex: `0x${string}`) => ({ output: asBuffer(hex), success: true });

// evm.view responses for a well-behaved ERC20 contract, keyed by calldata.
const erc20Responses = (): Map<string, { success: boolean; output: Buffer }> =>
	new Map([
		[
			calldataOf("totalSupply"),
			ok(encodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", result: 5000n })),
		],
		[calldataOf("name"), ok(encodeFunctionResult({ abi: erc20Abi, functionName: "name", result: "Test Token" }))],
		[calldataOf("symbol"), ok(encodeFunctionResult({ abi: erc20Abi, functionName: "symbol", result: "TEST" }))],
		[calldataOf("decimals"), ok(encodeFunctionResult({ abi: erc20Abi, functionName: "decimals", result: 8 }))],
	]);

type ViewResponse = { success: boolean; output: Buffer };

type Ctx = {
	app: Application;
	service: TokenParserService;
	evm: { view: (options: { data: Buffer }) => Promise<ViewResponse> };
	logger: any;
	databaseToken: unknown;
	respond: (impl: (calldata: string) => ViewResponse) => void;
};

describe<Ctx>("TokenParserService", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.databaseToken = undefined;

		const queryBuilder = {
			getOne: async () => context.databaseToken,
			where: () => queryBuilder,
		};

		context.evm = { view: async () => ({ output: Buffer.alloc(0), success: false }) };
		context.respond = (impl) => {
			context.evm.view = async ({ data }) => impl(data.toString("hex"));
		};
		context.logger = { debug: () => {}, debugExtra: () => {}, info: () => {}, warn: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue(context.logger);
		context.app
			.bind(Identifiers.Cryptography.Configuration)
			.toConstantValue({ getMilestone: () => ({ evmSpec: "Latest" }) });
		context.app
			.bind(ApiDatabaseIdentifiers.TokenRepositoryFactory)
			.toConstantValue(() => ({ createQueryBuilder: () => queryBuilder }));
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 32 })
			.whenTagged("plugin", "api-sync");

		context.service = context.app.resolve(TokenParserService);
	});

	const header = (number: number): any => ({ number });
	const transaction = (to: string | undefined = HOLDER_ONE): any => ({ hash: "0xtransaction", to });

	// Responses for a valid token plus per-holder balances; every probe succeeds.
	const respondAsErc20 = (context: Ctx, balances: Record<string, bigint> = {}) => {
		const known = erc20Responses();
		context.respond((calldata) => {
			if (known.has(calldata)) {
				return known.get(calldata)!;
			}

			for (const [account, balance] of Object.entries(balances)) {
				if (calldata === balanceOfCalldata(account as `0x${string}`)) {
					return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: balance }));
				}
			}

			return ok("0x01");
		});
	};

	it("collects a token action per Transfer event", async ({ service }) => {
		const { tokenActions, tokenHolders, tokens } = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 123n)],
		} as any);

		assert.equal(tokenActions, [
			{
				action: "Transfer",
				address: TOKEN,
				blockNumber: "5",
				from: HOLDER_ONE,
				index: 0,
				to: HOLDER_TWO,
				transactionHash: "0xtransaction",
				value: "123",
			},
		]);
		// The contract does not respond to the ERC20 probing, so no token metadata is stored.
		assert.equal(tokens, []);
		assert.equal(tokenHolders, []);
	});

	it("maps Approval events onto the same from/to shape", async ({ service }) => {
		const { tokenActions } = await service.parseReceipt(header(5), transaction(), {
			logs: [approvalLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 9n)],
		} as any);

		assert.equal(tokenActions.length, 1);
		assert.equal(tokenActions[0].action, "Approval");
		assert.equal(tokenActions[0].from, HOLDER_ONE);
		assert.equal(tokenActions[0].to, HOLDER_TWO);
		assert.equal(tokenActions[0].value, "9");
	});

	it("tolerates a receipt without a log field", async ({ service }) => {
		const { tokenActions, tokenHolders, tokens } = await service.parseReceipt(header(5), transaction(), {} as any);

		assert.equal(tokenActions, []);
		assert.equal(tokenHolders, []);
		assert.equal(tokens, []);
	});

	it("numbers actions per contract and resets the numbering on the next block", async ({ service }) => {
		const receiptOf = (token: string) => ({ logs: [transferLog(token, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;

		const first = await service.parseReceipt(header(5), transaction(), {
			logs: [
				transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
				transferLog(TOKEN, HOLDER_TWO, HOLDER_ONE, 2n),
				transferLog(OTHER_TOKEN, HOLDER_ONE, HOLDER_TWO, 3n),
			],
		} as any);
		assert.equal(
			first.tokenActions.map((action) => [action.address, action.index]),
			[
				[TOKEN, 0],
				[TOKEN, 1],
				[OTHER_TOKEN, 0],
			],
		);

		// A later receipt in the same block continues the numbering ...
		const sameBlock = await service.parseReceipt(header(5), transaction(), receiptOf(TOKEN));
		assert.equal(sameBlock.tokenActions[0].index, 2);

		// ... and a new block starts over.
		const nextBlock = await service.parseReceipt(header(6), transaction(), receiptOf(TOKEN));
		assert.equal(nextBlock.tokenActions[0].index, 0);
	});

	it("stores a detected ERC20 token including holder balances", async (context) => {
		respondAsErc20(context, { [HOLDER_ONE]: 70n, [HOLDER_TWO]: 30n });

		const { tokenActions, tokenHolders, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 30n)],
		} as any);

		assert.equal(tokenActions.length, 1);
		assert.equal(tokens, [
			{
				address: TOKEN,
				decimals: 8,
				deploymentHash: undefined,
				name: "Test Token",
				symbol: "TEST",
				// normalized from the decoded bigint
				totalSupply: "5000",
			},
		]);

		const balancesByAddress = new Map(tokenHolders.map((holder) => [holder.address, holder.balance]));
		assert.equal(balancesByAddress.get(HOLDER_ONE), "70");
		assert.equal(balancesByAddress.get(HOLDER_TWO), "30");
		assert.equal(
			tokenHolders.map((holder) => holder.tokenAddress),
			[TOKEN, TOKEN],
		);
	});

	it("links a deployment transaction to the token", async (context) => {
		respondAsErc20(context);

		const deployment: any = { hash: "0xtransaction", to: undefined };
		const { tokens } = await context.service.parseReceipt(header(5), deployment, {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens[0].deploymentHash, "0xtransaction");
	});

	it("does not treat a contract with empty call results as a token", async (context) => {
		// Default view responds unsuccessful + empty, which means "function does not exist".
		const { tokenHolders, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens, []);
		assert.equal(tokenHolders, []);
	});

	it("does not treat a contract with incomplete metadata as a token", async (context) => {
		const known = erc20Responses();
		context.respond((calldata) => {
			// symbol() reverts with data; everything else looks fine.
			if (calldata === calldataOf("symbol")) {
				return { output: asBuffer("0xff"), success: false };
			}
			return known.get(calldata) ?? ok("0x01");
		});

		const { tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens, []);
	});

	it("swallows exceptions thrown while probing a contract", async (context) => {
		const known = erc20Responses();
		context.respond((calldata) => {
			if (calldata === calldataOf("name")) {
				throw new Error("view blew up");
			}
			return known.get(calldata) ?? ok("0x01");
		});

		const { tokenActions, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		// The action is still recorded even though the metadata could not be resolved.
		assert.equal(tokenActions.length, 1);
		assert.equal(tokens, []);
	});

	it("falls back to a zero balance when balanceOf fails or throws", async (context) => {
		const known = erc20Responses();
		context.respond((calldata) => {
			if (calldata === balanceOfCalldata(HOLDER_ONE)) {
				return { output: Buffer.alloc(0), success: false };
			}
			if (calldata === balanceOfCalldata(HOLDER_TWO)) {
				throw new Error("balanceOf blew up");
			}
			return known.get(calldata) ?? ok("0x01");
		});
		const warn = spy(context.logger, "warn");

		const { tokenHolders, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens.length, 1);
		assert.equal(
			tokenHolders.map((holder) => holder.balance),
			["0", "0"],
		);
		warn.calledTimes(2);
	});

	it("serves repeated contracts from the cache without re-emitting the token", async (context) => {
		respondAsErc20(context, { [HOLDER_ONE]: 1n, [HOLDER_TWO]: 1n });
		const view = spy(context.evm, "view");

		const receipt = () => ({ logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;

		const first = await context.service.parseReceipt(header(5), transaction(), receipt());
		assert.equal(first.tokens.length, 1);
		view.reset();

		const second = await context.service.parseReceipt(header(6), transaction(), receipt());
		assert.equal(second.tokens, []);
		assert.equal(second.tokenHolders.length, 2);

		// Only the two balance lookups remain; the metadata probing is not repeated.
		view.calledTimes(2);
	});

	it("treats a token known to the database as existing", async (context) => {
		context.databaseToken = { address: TOKEN, decimals: 8, name: "Db Token", symbol: "DBT", totalSupply: "1" };
		respondAsErc20(context, { [HOLDER_ONE]: 4n, [HOLDER_TWO]: 4n });

		const { tokenHolders, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		// Nothing new to insert, but the holders are still tracked.
		assert.equal(tokens, []);
		assert.equal(tokenHolders.length, 2);
	});
});
