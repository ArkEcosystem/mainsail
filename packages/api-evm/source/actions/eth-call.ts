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

	public async handle(parameters: [TxData, Contracts.Crypto.BlockTag]): Promise<any> {
		const [data] = parameters;

		const {
			block: { maxGasLimit },
			gas: { minimumGasLimit, minimumGasPrice, maximumGasPrice },
			evmSpec,
		} = this.configuration.getMilestone();

		// Cap gas limit to milestone gas limit
		let gasLimit = BigInt(maxGasLimit);
		if (data.gas) {
			const userGasLimit = BigInt(data.gas);
			gasLimit = userGasLimit < gasLimit ? userGasLimit : gasLimit;

			if (gasLimit < minimumGasLimit) {
				gasLimit = BigInt(minimumGasLimit);
			}
		}

		// Accept 0 gas price for view calls.
		let gasPrice = BigInt(0);
		if (data.gasPrice) {
			const userGasPrice = BigInt(data.gasPrice);
			gasPrice = userGasPrice < minimumGasPrice && userGasPrice !== 0n ? BigInt(minimumGasPrice) : userGasPrice;

			if (gasPrice > maximumGasPrice) {
				gasPrice = BigInt(maximumGasPrice);
			}
		}

		const nonce = data.from ? (await this.evm.getAccountInfo(data.from)).nonce : 0;

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
				gasLimit,
				gasPrice,
				nonce: BigInt(nonce),
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
