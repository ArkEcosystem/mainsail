import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { Address, decodeFunctionResult, encodeFunctionData, toHex } from "viem";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";

@injectable()
export class ConsensusContractCaller {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
	private readonly deployerAddress!: Address;

	public async view<T>(functionName: string, arguments_?: readonly unknown[]): Promise<T> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const { evmSpec } = this.configuration.getMilestone();

		const data = encodeFunctionData({
			abi: ConsensusAbi.abi,
			args: arguments_,
			functionName,
		}).slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: this.deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate(`${functionName} failed`);
		}

		return decodeFunctionResult({
			abi: ConsensusAbi.abi,
			data: toHex(result.output!),
			functionName,
		}) as T;
	}
}
