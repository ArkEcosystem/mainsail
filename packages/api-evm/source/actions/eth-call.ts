import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ethers } from "ethers";

type TxData = {
	from?: string;
	to: string;
	data: string;
	gas?: string;
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
		} = this.configuration.getMilestone();

		// Cap gas limit to block gas limit
		let gasLimit = BigInt(maxGasLimit);
		if (data.gas) {
			const userGasLimit = BigInt(data.gas);
			gasLimit = userGasLimit < gasLimit ? userGasLimit : gasLimit;
		}

		const { success, output } = await this.evm.view({
			// default to zero address
			data: Buffer.from(ethers.getBytes(data.data)),
			from: data.from ?? "0x" + "0".repeat(40),
			gasLimit,
			specId: Contracts.Evm.SpecId.LATEST,
			to: data.to,
		});

		if (success) {
			return `0x${output?.toString("hex")}`;
		}

		throw new Exceptions.RpcError("execution reverted");
	}
}
