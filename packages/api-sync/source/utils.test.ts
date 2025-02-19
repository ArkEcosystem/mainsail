import { Contracts } from "@mainsail/contracts";
import { MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { describe } from "../../test-framework/source";
import { tryParseReceiptError } from "./utils";

describe("Utils", ({ it, assert }) => {
	it("should parseReceiptError from known contracts", () => {
		const contracts = [
			{
				name: "MultiPayment",
				address: "1",
				implementations: [{ address: "1", abi: MultiPaymentAbi.abi }],
			} as Contracts.Evm.DeployerContract,
			{
				name: "Usernames",
				address: "2",
				implementations: [{ address: "2", abi: UsernamesAbi.abi }],
			} as Contracts.Evm.DeployerContract,
		];

		const testCases = [
			{
				error: "InvalidUsername",
				receipt: {
					output: Buffer.from("50ef3288", "hex"),
					success: false,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "RecipientsAndAmountsMismatch",
				receipt: {
					output: Buffer.from("cdaa5276", "hex"),
					success: false,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "InvalidValue",
				receipt: {
					output: Buffer.from("aa7feadc", "hex"),
					success: false,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: undefined, // nothing inferred
				receipt: {
					output: Buffer.from("ffffffff", "hex"),
					success: false,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: undefined, // nothing inferred
				receipt: {
					output: Buffer.alloc(0),
					success: false,
				} as Contracts.Evm.TransactionReceipt,
			},
		];

		for (const { receipt, error } of testCases) {
			const parsed = tryParseReceiptError(contracts, receipt);
			if (error) {
				assert.defined(parsed);
				assert.equal(parsed, error);
			} else {
				assert.undefined(parsed);
			}
		}
	});
});
