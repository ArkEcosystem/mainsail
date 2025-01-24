import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

type TxData = {
	from: string;
	to: string;
	data?: string;
	gas?: string;
	gasPrice: string;
	value: string;
};

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

		maxItems: 2,
		minItems: 2,

		prefixItems: [
			{
				additionalProperties: false,
				properties: {
					data: { $ref: "prefixedHex" },
					from: { $ref: "address" },
					gas: { $ref: "prefixedHex" },
					gasPrice: { $ref: "prefixedHex" },
					to: { $ref: "address" },
					value: { $ref: "prefixedHex" },
				},
				required: ["from", "to", "gasPrice"],
				type: "object",
			},
			{ $ref: "blockTag" },
		],

		type: "array",
	};

	public async handle(parameters: [TxData, Contracts.Crypto.BlockTag]): Promise<any> {
		const [data] = parameters;

		try {
			const { evmSpec, block } = this.configuration.getMilestone();

			const accountInfo = await this.evm.getAccountInfo(data.from);

			const commitKey = { height: BigInt(this.configuration.getHeight()), round: BigInt(0) };

			const dataToProcess = {
				blockContext: {
					commitKey,
					gasLimit: BigInt(block.maxGasLimit),
					timestamp: BigInt(dayjs().valueOf()),
					validatorAddress: "0x0000000000000000000000000000000000000001",
				},
				caller: data.from,
				data: data.data ? Buffer.from(data.data.slice(2), "hex") : Buffer.alloc(0),
				gasLimit: data.gas ? BigInt(data.gas) : BigInt(block.maxGasLimit),
				gasPrice: BigInt(data.gasPrice),
				nonce: accountInfo.nonce,
				recipient: data.to,
				specId: evmSpec,
				txHash: "0".repeat(64),
				value: BigInt(data.value),
			};

			await this.evm.prepareNextCommit({
				commitKey,
			});

			const { receipt } = await this.evm.process(dataToProcess);
			const { success, gasUsed } = receipt;

			console.log("Receipt", receipt);

			if (success) {
				return `0x${gasUsed.toString(16)}`;
			}
		} catch (error) {
			console.log(error);
		}

		throw new Exceptions.RpcError("execution reverted");
	}
}
