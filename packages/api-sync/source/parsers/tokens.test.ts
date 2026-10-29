import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	encodeAbiParameters,
	encodeEventTopics,
	encodeFunctionData,
	encodeFunctionResult,
	parseAbi,
	zeroAddress,
} from "viem";

import { TokenParserService } from "./tokens.js";

const erc20Abi = parseAbi([
	"function totalSupply() view returns (uint256)",
	"function balanceOf(address account) view returns (uint256)",
	"function name() view returns (string)",
	"function symbol() view returns (string)",
	"function decimals() view returns (uint8)",
	"function allowance(address owner, address spender) view returns (uint256)",
	"function transfer(address recipient, uint256 amount) returns (bool)",
	"function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
	"function approve(address spender, uint256 amount) returns (bool)",
	"event Transfer(address indexed from, address indexed to, uint256 value)",
	"event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const);

const TOKEN = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_TOKEN = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HOLDER_ONE = "0x1111111111111111111111111111111111111111";
const HOLDER_TWO = "0x2222222222222222222222222222222222222222";
const PROBE_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

const contractAt = (index: number): string => `0x${(index + 1).toString(16).padStart(40, "c")}`;

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

type ViewResponse = { success: boolean; output?: Buffer };

type Ctx = {
	app: Application;
	service: TokenParserService;
	evm: { view: (options: { data: Buffer }) => Promise<ViewResponse> };
	logger: any;
	databaseToken: unknown;
	queryBuilder: { getOne: () => Promise<unknown>; where: () => unknown };
	respond: (impl: (calldata: string) => ViewResponse) => void;
};

describe<Ctx>("TokenParserService", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.databaseToken = undefined;

		const queryBuilder = {
			getOne: async () => context.databaseToken,
			where: () => queryBuilder,
		};
		context.queryBuilder = queryBuilder;

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
			.toConstantValue({ getMilestone: () => ({ evmSpec: "Osaka" }), getNetwork: () => ({ chainId: 10_000 }) });
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

	const respondWithOutput = (
		respond: Ctx["respond"],
		functionName: "name" | "symbol" | "decimals",
		output: `0x${string}`,
	) => {
		const known = erc20Responses();
		respond((calldata) =>
			calldata === calldataOf(functionName) ? ok(output) : (known.get(calldata) ?? ok("0x01")),
		);
	};

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

	it("numbers actions across tokens in emission order and resets the numbering on the next block", async ({
		service,
	}) => {
		const receiptOf = (token: string) => ({ logs: [transferLog(token, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;

		const first = await service.parseReceipt(header(5), transaction(), {
			logs: [
				transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
				transferLog(OTHER_TOKEN, HOLDER_ONE, HOLDER_TWO, 3n),
				transferLog(TOKEN, HOLDER_TWO, HOLDER_ONE, 2n),
			],
		} as any);
		assert.equal(
			first.tokenActions.map((action) => [action.address, action.index]),
			[
				[TOKEN, 0],
				[OTHER_TOKEN, 1],
				[TOKEN, 2],
			],
		);

		// A later receipt in the same block continues the numbering ...
		const sameBlock = await service.parseReceipt(header(5), transaction(), receiptOf(TOKEN));
		assert.equal(sameBlock.tokenActions[0].index, 3);

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

	it("does not treat a contract with a NUL byte in its name or symbol as a token", async ({ respond, service }) => {
		const cases = [
			["name", "Test\u0000Token"],
			["name", "\u0000Test"],
			["symbol", "T\u0000ST"],
		] as const;

		for (const [index, [functionName, result]] of cases.entries()) {
			respondWithOutput(respond, functionName, encodeFunctionResult({ abi: erc20Abi, functionName, result }));

			const { tokens } = await service.parseReceipt(header(5), transaction(), {
				logs: [transferLog(contractAt(index), HOLDER_ONE, HOLDER_TWO, 1n)],
			} as any);

			assert.equal(tokens, []);
		}
	});

	it("does not treat a contract whose name or symbol exceeds 64 characters as a token", async ({
		respond,
		service,
	}) => {
		for (const [index, functionName] of (["name", "symbol"] as const).entries()) {
			respondWithOutput(
				respond,
				functionName,
				encodeFunctionResult({ abi: erc20Abi, functionName, result: "S".repeat(64) }),
			);
			const accepted = await service.parseReceipt(header(5), transaction(), {
				logs: [transferLog(contractAt(index * 2), HOLDER_ONE, HOLDER_TWO, 1n)],
			} as any);

			respondWithOutput(
				respond,
				functionName,
				encodeFunctionResult({ abi: erc20Abi, functionName, result: "S".repeat(65) }),
			);
			const rejected = await service.parseReceipt(header(5), transaction(), {
				logs: [transferLog(contractAt(index * 2 + 1), HOLDER_ONE, HOLDER_TWO, 1n)],
			} as any);

			assert.equal(
				accepted.tokens.map((token) => token[functionName]),
				["S".repeat(64)],
			);
			assert.equal(rejected.tokens, []);
		}
	});

	it("does not treat a contract whose decimals exceed a uint8 as a token", async ({ respond, service }) => {
		respondWithOutput(respond, "decimals", encodeAbiParameters([{ type: "uint256" }], [255n]));
		const accepted = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(contractAt(0), HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(
			accepted.tokens.map((token) => token.decimals),
			[255],
		);

		for (const [index, decimals] of [256n, 2n ** 256n - 1n].entries()) {
			respondWithOutput(respond, "decimals", encodeAbiParameters([{ type: "uint256" }], [decimals]));

			const { tokens } = await service.parseReceipt(header(5), transaction(), {
				logs: [transferLog(contractAt(index + 1), HOLDER_ONE, HOLDER_TWO, 1n)],
			} as any);

			assert.equal(tokens, []);
		}
	});

	it("probes with zero-amount writes from the zero address and a 100k gas limit", async ({ evm, service }) => {
		const known = erc20Responses();
		const gasLimits: Record<string, bigint> = {};
		const senders = new Set<string>();
		evm.view = async (options: any) => {
			gasLimits[options.data.toString("hex")] = options.gasLimit;
			senders.add(options.from);
			return known.get(options.data.toString("hex")) ?? ok("0x01");
		};

		await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		const calldata = (parameters: Parameters<typeof encodeFunctionData<typeof erc20Abi>>[0]) =>
			encodeFunctionData(parameters).slice(2);
		assert.equal([...senders], [zeroAddress]);
		assert.equal(gasLimits, {
			[calldataOf("totalSupply")]: 100_000n,
			[calldataOf("name")]: 100_000n,
			[calldataOf("symbol")]: 100_000n,
			[calldataOf("decimals")]: 100_000n,
			[calldata({ abi: erc20Abi, args: [zeroAddress, zeroAddress], functionName: "allowance" })]: 100_000n,
			[balanceOfCalldata(zeroAddress)]: 100_000n,
			[calldata({ abi: erc20Abi, args: [PROBE_RECIPIENT, 0n], functionName: "transfer" })]: 100_000n,
			[calldata({ abi: erc20Abi, args: [zeroAddress, PROBE_RECIPIENT, 0n], functionName: "transferFrom" })]:
				100_000n,
			[calldata({ abi: erc20Abi, args: [PROBE_RECIPIENT, 0n], functionName: "approve" })]: 100_000n,
			[balanceOfCalldata(HOLDER_ONE)]: 100_000n,
			[balanceOfCalldata(HOLDER_TWO)]: 100_000n,
		});
	});

	it("links a deployment transaction to the token", async (context) => {
		respondAsErc20(context);

		const deployment: any = { hash: "0xtransaction", to: undefined };
		const { tokens } = await context.service.parseReceipt(header(5), deployment, {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens[0].deploymentHash, "0xtransaction");
	});

	it("does not probe a contract again once it is known not to be a token", async ({
		evm,
		queryBuilder,
		respond,
		service,
	}) => {
		respondWithOutput(respond, "name", "0x01");
		const view = spy(evm, "view");
		const lookup = spy(queryBuilder, "getOne");
		const receipt = () => ({ logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;

		await service.parseReceipt(header(5), transaction(), receipt());
		view.calledTimes(2);
		lookup.calledOnce();
		view.reset();
		lookup.reset();

		const { tokenHolders, tokens } = await service.parseReceipt(header(6), transaction(), receipt());

		assert.equal(tokens, []);
		assert.equal(tokenHolders, []);
		view.neverCalled();
		lookup.neverCalled();
	});

	it("probes a contract that is not a token again after 100 blocks", async ({ evm, service }) => {
		const receipt = () => ({ logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;
		await service.parseReceipt(header(5), transaction(), receipt());
		const view = spy(evm, "view");

		await service.parseReceipt(header(104), transaction(), receipt());
		view.neverCalled();

		await service.parseReceipt(header(105), transaction(), receipt());
		view.calledOnce();
	});

	it("keeps the most recently seen non-tokens cached, as many as the token cache holds", async ({ evm, service }) => {
		const receiptOf = (contracts: string[]) =>
			({ logs: contracts.map((contract) => transferLog(contract, HOLDER_ONE, HOLDER_TWO, 1n)) }) as any;
		const others = Array.from({ length: 32 }, (_, index) => contractAt(index));

		await service.parseReceipt(header(5), transaction(), receiptOf([TOKEN, ...others.slice(0, 31)]));
		const view = spy(evm, "view");

		await service.parseReceipt(header(6), transaction(), receiptOf([TOKEN, others[31]]));
		await service.parseReceipt(header(7), transaction(), receiptOf([TOKEN, others[0]]));

		view.calledTimes(2);
	});

	it("looks up a token evicted from the token cache in the database", async (context) => {
		respondAsErc20(context, { [HOLDER_ONE]: 1n, [HOLDER_TWO]: 1n });
		const receiptOf = (contracts: string[]) =>
			({ logs: contracts.map((contract) => transferLog(contract, HOLDER_ONE, HOLDER_TWO, 1n)) }) as any;
		await context.service.parseReceipt(header(5), transaction(), receiptOf([TOKEN]));

		// Served from the database, 32 other tokens push TOKEN out of the token cache.
		context.databaseToken = {
			address: TOKEN,
			decimals: 8,
			name: "Test Token",
			symbol: "TEST",
			totalSupply: "5000",
		};
		await context.service.parseReceipt(
			header(6),
			transaction(),
			receiptOf(Array.from({ length: 32 }, (_, index) => contractAt(index))),
		);
		const lookup = spy(context.queryBuilder, "getOne");

		const { tokenHolders, tokens } = await context.service.parseReceipt(
			header(7),
			transaction(),
			receiptOf([TOKEN]),
		);

		lookup.calledOnce();
		assert.equal(tokens, []);
		assert.equal(tokenHolders.length, 2);
	});

	it("does not treat a contract with empty call results as a token", async (context) => {
		// Default view responds unsuccessful + empty, which means "function does not exist".
		const { tokenHolders, tokens } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens, []);
		assert.equal(tokenHolders, []);
	});

	it("does not treat a contract as a token when a probe runs out of gas", async ({ respond, service }) => {
		const known = erc20Responses();
		const approve = encodeFunctionData({ abi: erc20Abi, args: [PROBE_RECIPIENT, 0n], functionName: "approve" });
		respond((calldata) =>
			calldata === approve.slice(2) ? { output: undefined, success: false } : (known.get(calldata) ?? ok("0x01")),
		);

		const { tokens } = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens, []);
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

	it("probes a contract again after a view call throws", async ({ logger, respond, service }) => {
		const known = erc20Responses();
		respond((calldata) => {
			if (calldata === calldataOf("name")) {
				throw new Error("view call failed reading state");
			}
			return known.get(calldata) ?? ok("0x01");
		});
		const warn = spy(logger, "warn");
		const receipt = () => ({ logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)] }) as any;

		const failed = await service.parseReceipt(header(5), transaction(), receipt());
		warn.calledOnce();

		respond((calldata) => known.get(calldata) ?? ok("0x01"));
		const retried = await service.parseReceipt(header(6), transaction(), receipt());

		assert.equal(failed.tokenActions.length, 1);
		assert.equal(failed.tokens, []);
		assert.equal(retried.tokens.length, 1);
	});

	it("still probes the other contracts of a receipt after a view call throws", async ({ evm, service }) => {
		const known = erc20Responses();
		evm.view = async (options: any) => {
			if (options.to === TOKEN) {
				throw new Error("view call failed reading state");
			}
			return known.get(options.data.toString("hex")) ?? ok("0x01");
		};

		const { tokens } = await service.parseReceipt(header(5), transaction(), {
			logs: [
				transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
				transferLog(OTHER_TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
			],
		} as any);

		assert.equal(
			tokens.map((token) => token.address),
			[OTHER_TOKEN],
		);
	});

	it("skips the holder when balanceOf fails or throws", async ({ logger, respond, service }) => {
		const known = erc20Responses();
		respond((calldata) => {
			if (calldata === balanceOfCalldata(HOLDER_ONE)) {
				return { output: Buffer.alloc(0), success: false };
			}
			if (calldata === balanceOfCalldata(HOLDER_TWO)) {
				throw new Error("balanceOf blew up");
			}
			return known.get(calldata) ?? ok("0x01");
		});
		const warn = spy(logger, "warn");

		const { tokenHolders, tokens } = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n)],
		} as any);

		assert.equal(tokens.length, 1);
		assert.equal(tokenHolders, []);
		warn.calledTimes(2);
	});

	it("keeps a zero balance so the holder can be removed", async (context) => {
		respondAsErc20(context, { [HOLDER_ONE]: 0n, [HOLDER_TWO]: 30n });

		const { tokenHolders } = await context.service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 30n)],
		} as any);

		assert.equal(tokenHolders, [
			{ address: HOLDER_ONE, balance: "0", tokenAddress: TOKEN },
			{ address: HOLDER_TWO, balance: "30", tokenAddress: TOKEN },
		]);
	});

	it("skips only the holder whose balance cannot be read", async ({ logger, respond, service }) => {
		const known = erc20Responses();
		respond((calldata) => {
			if (calldata === balanceOfCalldata(HOLDER_ONE)) {
				return { output: Buffer.alloc(0), success: false };
			}
			if (calldata === balanceOfCalldata(HOLDER_TWO)) {
				return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 30n }));
			}
			return known.get(calldata) ?? ok("0x01");
		});
		const warn = spy(logger, "warn");

		const { tokenHolders } = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 30n)],
		} as any);

		assert.equal(tokenHolders, [{ address: HOLDER_TWO, balance: "30", tokenAddress: TOKEN }]);
		warn.calledOnce();
	});

	it("skips the holder when balanceOf succeeds with malformed output", async ({ logger, respond, service }) => {
		const known = erc20Responses();
		respond((calldata) => {
			if (calldata === balanceOfCalldata(HOLDER_ONE)) {
				return ok("0x01");
			}
			if (calldata === balanceOfCalldata(HOLDER_TWO)) {
				return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 30n }));
			}
			return known.get(calldata) ?? ok("0x01");
		});
		const warn = spy(logger, "warn");

		const { tokenHolders } = await service.parseReceipt(header(5), transaction(), {
			logs: [transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 30n)],
		} as any);

		assert.equal(tokenHolders, [{ address: HOLDER_TWO, balance: "30", tokenAddress: TOKEN }]);
		warn.calledOnce();
	});

	it("still reads the other tokens of an account after one balanceOf fails", async ({ evm, service }) => {
		const known = erc20Responses();
		evm.view = async (options: any) => {
			const calldata = options.data.toString("hex");
			if (calldata === balanceOfCalldata(HOLDER_ONE)) {
				return options.to === TOKEN
					? { output: Buffer.alloc(0), success: false }
					: ok(encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 7n }));
			}
			return known.get(calldata) ?? ok("0x01");
		};

		const { tokenHolders } = await service.parseReceipt(header(5), transaction(), {
			logs: [
				transferLog(TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
				transferLog(OTHER_TOKEN, HOLDER_ONE, HOLDER_TWO, 1n),
			],
		} as any);

		assert.equal(
			tokenHolders.filter((holder) => holder.address === HOLDER_ONE),
			[{ address: HOLDER_ONE, balance: "7", tokenAddress: OTHER_TOKEN }],
		);
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
