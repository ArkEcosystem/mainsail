import { describe } from "@mainsail/test-runner";
import { encodeAbiParameters, encodeEventTopics, parseAbi } from "viem";

import { parseMultiPayments } from "./multi-payment.js";

const paymentAbi = parseAbi(["event Payment(address indexed recipient, uint256 amount, bool success)"] as const);

const MULTIPAYMENT_CONTRACT = "0x1000000000000000000000000000000000000000";
const RECIPIENT_ONE = "0x1111111111111111111111111111111111111111";
const RECIPIENT_TWO = "0x2222222222222222222222222222222222222222";

const paymentLog = (recipient: string, amount: bigint, success: boolean) => ({
	address: MULTIPAYMENT_CONTRACT,
	data: encodeAbiParameters(
		[
			{ name: "amount", type: "uint256" },
			{ name: "success", type: "bool" },
		],
		[amount, success],
	),
	topics: encodeEventTopics({ abi: paymentAbi, args: { recipient }, eventName: "Payment" }),
});

const otherLog = () => ({
	address: MULTIPAYMENT_CONTRACT,
	data: "0x" as const,
	topics: ["0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"] as [`0x${string}`],
});

const transaction = (to: string | undefined): any => ({ hash: "0xtransaction", to });

describe("parseMultiPayments", ({ assert, it }) => {
	it("ignores transactions that do not target the multi payment contract", () => {
		const result = parseMultiPayments(MULTIPAYMENT_CONTRACT, transaction(RECIPIENT_ONE), {
			logs: [paymentLog(RECIPIENT_ONE, 10n, true)],
		} as any);

		assert.equal(result, []);
	});

	it("ignores contract deployments (transaction without recipient)", () => {
		const result = parseMultiPayments(MULTIPAYMENT_CONTRACT, transaction(undefined), {
			logs: [paymentLog(RECIPIENT_ONE, 10n, true)],
		} as any);

		assert.equal(result, []);
	});

	it("returns nothing without logs", () => {
		assert.equal(
			parseMultiPayments(MULTIPAYMENT_CONTRACT, transaction(MULTIPAYMENT_CONTRACT), { logs: [] } as any),
			[],
		);
	});

	it("tolerates a receipt without a log field", () => {
		assert.equal(parseMultiPayments(MULTIPAYMENT_CONTRACT, transaction(MULTIPAYMENT_CONTRACT), {} as any), []);
	});

	it("maps every Payment event to a model with a running log index", () => {
		const result = parseMultiPayments(MULTIPAYMENT_CONTRACT, transaction(MULTIPAYMENT_CONTRACT), {
			logs: [paymentLog(RECIPIENT_ONE, 10n, true), otherLog(), paymentLog(RECIPIENT_TWO, 20n, false)],
		} as any);

		assert.equal(result, [
			{ amount: "10", hash: "0xtransaction", logIndex: 0, success: true, to: RECIPIENT_ONE },
			{ amount: "20", hash: "0xtransaction", logIndex: 1, success: false, to: RECIPIENT_TWO },
		]);
	});
});
