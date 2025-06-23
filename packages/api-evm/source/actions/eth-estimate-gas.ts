import crypto from "node:crypto";

import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import dayjs from "dayjs";

type TxData = {
	from: string;
	to: string;
	data?: string;
	gas?: string;
	gasPrice?: string;
	value?: string;
};

interface EstimateOutcome {
	receipt?: Contracts.Evm.TransactionReceipt;
	success: boolean;
	executionError?: string;
}

@injectable()
export class EthEstimateGasAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "validator")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	public readonly name: string = "eth_estimateGas";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [
			{
				additionalProperties: false,
				properties: {
					data: { $ref: "prefixedDataHex" },
					from: { $ref: "address" },
					gas: { $ref: "prefixedQuantityHex" },
					gasPrice: { $ref: "prefixedQuantityHex" },
					to: { $ref: "address" },
					value: { $ref: "prefixedQuantityHex" },
				},
				required: ["from", "to"],
				type: "object",
			},
		],

		type: "array",
	};

	// Loosely based on https://github.com/ethereum/go-ethereum/blob/5606cbc710ffcf327740e4db54776eb8a3c1a2fc/eth/gasestimator/gasestimator.go#L54
	public async handle(parameters: [TxData]): Promise<any> {
		const defaultGas = 21_000;

		const [data] = parameters;

		const { evmSpec, block, gas } = this.configuration.getMilestone();

		const accountInfo = await this.evm.getAccountInfo(data.from);

		// Skip estimation if it's a vanilla transfer and recipient is not a contract
		if (!data.data || data.data === "0x") {
			const targetCode = await this.evm.codeAt(data.to);
			if (targetCode === "0x") {
				return `0x${defaultGas.toString(16)}`;
			}
		}

		const commitKey = { blockNumber: BigInt(this.configuration.getHeight()), round: BigInt(0) };

		let maxGasLimit = data.gas ? BigInt(data.gas) : BigInt(block.maxGasLimit);
		let minGasLimit = maxGasLimit;

		const context = {
			blockContext: {
				commitKey,
				gasLimit: BigInt(block.maxGasLimit),
				timestamp: BigInt(dayjs().valueOf()),
				validatorAddress: "0x0000000000000000000000000000000000000001",
			},
			data: data.data ? Buffer.from(data.data.slice(2), "hex") : Buffer.alloc(0),
			from: data.from,
			gasLimit: maxGasLimit,
			gasPrice: data.gasPrice ? BigInt(data.gasPrice) : BigInt(gas.minimumGasPrice),
			nonce: accountInfo.nonce,
			specId: evmSpec,
			to: data.to,
			txHash: this.#generateTxHash(),
			value: data.value ? BigInt(data.value) : BigInt(0),
		};

		// Execute with max allowed gas limit
		let { success, receipt, executionError } = await this.#execute(context);
		if (executionError) {
			throw new Exceptions.RpcError(`execution reverted: ${executionError}`);
		}

		// First execution failed, so no point in trying further
		if (!success) {
			throw new Exceptions.RpcError("execution reverted");
		}

		assert.defined(receipt);

		// For almost any transaction, the gas consumed by the unconstrained execution
		// above lower-bounds the gas limit required for it to succeed
		minGasLimit = receipt.gasUsed - 1n;

		// There's a fairly high chance for the transaction to execute successfully
		// with gasLimit set to the first execution's usedGas + gasRefund. Explicitly
		// check that gas amount and use as a limit for the binary search.
		const optimisticGasLimit = (receipt.gasUsed + receipt.gasRefunded + 2300n) * (64n / 63n);
		if (optimisticGasLimit < maxGasLimit) {
			const { success, executionError } = await this.#execute({ ...context, gasLimit: optimisticGasLimit });
			if (executionError) {
				// This should not happen under normal conditions since if we make it this far the
				// transaction had run without error at least once before.
				throw new Exceptions.RpcError(`execution reverted: ${executionError}`);
			}

			if (success) {
				maxGasLimit = optimisticGasLimit;
			} else {
				minGasLimit = optimisticGasLimit;
			}
		}

		// Try to find the smallest gas limit using binary search.
		while (minGasLimit + 1n < maxGasLimit) {
			// Since it's a best effort we don't care about making a perfect estimation and instead bail out
			// early once close enough.
			const errorRatio = 0.015;
			if (Number(maxGasLimit - minGasLimit) / Number(maxGasLimit) < errorRatio) {
				break;
			}

			let midGasLimit = (maxGasLimit + minGasLimit) / 2n;
			if (midGasLimit > minGasLimit * 2n) {
				// Most txs don't need much higher gas limit than their gas used, and most txs don't
				// require near the full block limit of gas, so the selection of where to bisect the
				// range here is skewed to favor the low side.
				midGasLimit = minGasLimit * 2n;
			}

			({ success, executionError } = await this.#execute({ ...context, gasLimit: midGasLimit }));
			if (executionError) {
				throw new Exceptions.RpcError(`execution reverted: ${executionError}`);
			}

			if (success) {
				maxGasLimit = midGasLimit;
			} else {
				minGasLimit = midGasLimit;
			}
		}

		return `0x${maxGasLimit.toString(16)}`;
	}

	async #execute(context: Contracts.Evm.TransactionContext): Promise<EstimateOutcome> {
		await this.evm.prepareNextCommit({
			commitKey: context.blockContext.commitKey,
		});

		try {
			const { receipt } = await this.evm.process(context);
			return { receipt, success: receipt.status === 1 };
		} catch (error) {
			return { executionError: error.message, success: false };
		}
	}

	#generateTxHash = () => {
		const randomBytes = crypto.randomBytes(32);
		return crypto.createHash("sha256").update(randomBytes).digest("hex");
	};
}
