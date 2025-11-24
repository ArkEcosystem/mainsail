import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { RpcError } from "@mainsail/exceptions";
import dayjs from "dayjs";
import { zeroAddress } from "viem";

type TxData = {
	from?: string;
	to: string;
	data: string;
	gas?: string;
	gasPrice?: string;
	value?: string;
};

@injectable()
export class CallAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "rpc")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	public readonly name: string = "eth_call";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

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
				required: ["to", "data"],
				type: "object",
			},
			{ $ref: "blockTag" },
		],

		type: "array",
	};

	#getGasLimit(data: TxData, milestone: Contracts.Crypto.Milestone): bigint {
		const {
			gas: { maximumGasLimit, minimumGasLimit },
		} = milestone;

		// Cap gas limit to milestone gas limits
		if (data.gas) {
			const userGasLimit = BigInt(data.gas);

			if (userGasLimit > maximumGasLimit) {
				return BigInt(maximumGasLimit);
			}

			if (userGasLimit < minimumGasLimit) {
				return BigInt(minimumGasLimit);
			}
		}

		return BigInt(maximumGasLimit);
	}

	#getGasPrice(data: TxData, milestone: Contracts.Crypto.Milestone): bigint {
		const {
			gas: { minimumGasPrice, maximumGasPrice },
		} = milestone;

		// Accept 0 gas price for view calls
		// Cap gas price to milestone limits if !== 0
		if (data.gasPrice) {
			const userGasPrice = BigInt(data.gasPrice);

			if (userGasPrice === 0n) {
				return 0n;
			}

			if (userGasPrice < minimumGasPrice) {
				return BigInt(minimumGasPrice);
			}

			if (userGasPrice > maximumGasPrice) {
				return BigInt(maximumGasPrice);
			}
		}

		return 0n;
	}

	async #getNonce(data: TxData): Promise<bigint> {
		if (data.from) {
			const accountInfo = await this.evm.getAccountInfo(data.from);
			return BigInt(accountInfo.nonce);
		}

		return 0n;
	}

	public async handle(parameters: [TxData, Contracts.Crypto.BlockTag]): Promise<any> {
		const [data] = parameters;

		const milestone = this.configuration.getMilestone();

		const {
			block: { maxGasLimit },
			evmSpec,
		} = milestone;

		try {
			const { receipt } = await this.evm.simulate({
				blockContext: {
					commitKey: { blockNumber: BigInt(this.configuration.getHeight()), round: BigInt(0) },
					gasLimit: BigInt(maxGasLimit),
					timestamp: BigInt(dayjs().valueOf()),
					validatorAddress: "0x0000000000000000000000000000000000000001",
				},
				data: data.data ? Buffer.from(data.data.slice(2), "hex") : Buffer.alloc(0),
				from: data.from ?? zeroAddress,
				gasLimit: this.#getGasLimit(data, milestone),
				gasPrice: this.#getGasPrice(data, milestone),
				nonce: await this.#getNonce(data),
				specId: evmSpec,
				to: data.to,
				value: data.value ? BigInt(data.value) : BigInt(0),
			});

			if (receipt.status === 1) {
				return `0x${receipt.output?.toString("hex")}`;
			}
		} catch (ex) {
			throw new RpcError(`execution reverted: ${ex.message}`);
		}

		throw new RpcError("execution reverted");
	}
}
