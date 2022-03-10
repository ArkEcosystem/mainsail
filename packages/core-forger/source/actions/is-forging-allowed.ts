import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services, Types, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { NetworkStateStatus } from "@arkecosystem/core-p2p";

@injectable()
export class IsForgingAllowedAction extends Services.Triggers.Action {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const validator: Contracts.Forger.Validator = arguments_.validator;
		const networkState: Contracts.P2P.NetworkState = arguments_.networkState;

		switch (networkState.status) {
			case NetworkStateStatus.Unknown: {
				this.logger.info("Failed to get network state from client. Will not forge.");
				return false;
			}
			case NetworkStateStatus.ColdStart: {
				this.logger.info("Skipping slot because of cold start. Will not forge.");
				return false;
			}
			case NetworkStateStatus.BelowMinimumPeers: {
				this.logger.info("Network reach is not sufficient to get quorum. Will not forge.");
				return false;
			}
			// No default
		}

		const overHeightBlockHeaders: Array<{
			[id: string]: any;
		}> = networkState.getOverHeightBlockHeaders();
		if (overHeightBlockHeaders.length > 0) {
			this.logger.info(
				`Detected ${AppUtils.pluralize(
					"distinct overheight block header",
					overHeightBlockHeaders.length,
					true,
				)}.`,
			);

			for (const overHeightBlockHeader of overHeightBlockHeaders) {
				if (overHeightBlockHeader.generatorPublicKey === validator.publicKey) {
					AppUtils.assert.defined<string>(validator.publicKey);

					const username: string = this.app.get<Record<string, string>>(Identifiers.Forger.Usernames)[
						validator.publicKey
					];

					this.logger.warning(
						`Possible double forging validator: ${username} (${validator.publicKey}) - Block: ${overHeightBlockHeader.id}.`,
					);
				}
			}
		}

		if (networkState.getQuorum() < 0.66) {
			this.logger.info("Not enough quorum to forge next block. Will not forge.");
			this.logger.debug(`Network State: ${networkState.toJson()}`);

			return false;
		}

		return true;
	}
}
