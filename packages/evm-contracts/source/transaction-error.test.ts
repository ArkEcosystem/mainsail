import { Contracts } from "@mainsail/contracts";
import { describe } from "../../test-framework/source";
import { parseTransactionError } from "./transaction-error";

describe("TransactionError", ({ it, assert }) => {
	it("should parseTransactionError from known contracts", () => {
		const testCases = [
			{
				error: "InvalidUsername",
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from("50ef3288", "hex"),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "RecipientsAndAmountsMismatch",
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from("cdaa5276", "hex"),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "InvalidValue",
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from("aa7feadc", "hex"),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "Error (Caller is not allowed)", // revert("Caller is not allowed")
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from(
						"08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001543616c6c6572206973206e6f7420616c6c6f7765640000000000000000000000",
						"hex",
					),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "Panic (0x1): An `assert` condition failed", // assert(false) - also see https://docs.soliditylang.org/en/latest/control-structures.html#panic-via-assert-and-error-via-require
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from(
						"4e487b710000000000000000000000000000000000000000000000000000000000000001",
						"hex",
					),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "Panic (0x12): Division or modulo by zero", // Division By Zero
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from(
						"4e487b710000000000000000000000000000000000000000000000000000000000000012",
						"hex",
					),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "out of gas",
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.alloc(0),
					gasUsed: 21000n,
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "execution reverted", // generic fallback
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from("ffffffff", "hex"),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "execution reverted", // generic fallback
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.from("ff"),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "execution reverted", // generic fallback
				transaction: { data: { gasLimit: 21000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.alloc(0),
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
			{
				error: "execution reverted", // generic fallback
				transaction: { data: { gasLimit: 30000 } } as Contracts.Crypto.Transaction,
				receipt: {
					output: Buffer.alloc(0),
					gasUsed: 21000n,
					status: 0,
				} as Contracts.Evm.TransactionReceipt,
			},
		];

		for (const { transaction, receipt, error } of testCases) {
			const parsed = parseTransactionError(transaction, receipt);
			if (error) {
				assert.defined(parsed);
				assert.equal(parsed, error);
			} else {
				assert.undefined(parsed);
			}
		}
	});
});
