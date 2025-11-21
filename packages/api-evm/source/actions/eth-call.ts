import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { RpcError } from "@mainsail/exceptions";
import dayjs from "dayjs";

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
			gas: { minimumGasPrice },
			evmSpec,
		} = this.configuration.getMilestone();

		// Cap gas limit to block gas limit
		let gasLimit = BigInt(maxGasLimit);
		if (data.gas) {
			const userGasLimit = BigInt(data.gas);
			gasLimit = userGasLimit < gasLimit ? userGasLimit : gasLimit;
		}

		/*
		const { success, output } = await this.evm.view({
			// default to zero address
			data: Buffer.from(toBytes(data.data)),
			from: data.from ?? "0x" + "0".repeat(40),
			gasLimit,
			specId: Enums.Evm.SpecId.LATEST,
			to: data.to,
		});
		*/

		const commitKey = { blockNumber: BigInt(this.configuration.getHeight()), round: BigInt(0) };

		const nonce = data.from ? (await this.evm.getAccountInfo(data.from)).nonce : 0;

		const { receipt } = await this.evm.simulate({
			blockContext: {
				commitKey,
				gasLimit: BigInt(maxGasLimit),
				timestamp: BigInt(dayjs().valueOf()),
				validatorAddress: "0x0000000000000000000000000000000000000001",
			},
			data: data.data ? Buffer.from(data.data.slice(2), "hex") : Buffer.alloc(0),
			from: data.from ?? "0x" + "0".repeat(40),
			gasLimit,
			// gasPrice: data.gasPrice ? BigInt(data.gasPrice) : BigInt(gas.minimumGasPrice),
			gasPrice: BigInt(minimumGasPrice),
			nonce: BigInt(nonce),
			specId: evmSpec,
			to: data.to,
			value: data.value ? BigInt(data.value) : BigInt(0),
		});

		if (receipt.status === 1) {
			return `0x${receipt.output?.toString("hex")}`;
		}

		throw new RpcError("execution reverted");
	}
}
