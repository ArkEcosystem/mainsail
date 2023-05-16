import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class BlockTimeLookup {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async getBlockTimeLookup(height: number): Promise<number> {
		const findBlockTimestampByHeight = async (height: number): Promise<number> =>
			(
				await this.app
					.get<Contracts.Database.IDatabaseService>(Identifiers.Database.Service)
					.findBlockByHeights([height])
			)[0].data.timestamp;

		let nextMilestone = this.configuration.getNextMilestoneWithNewKey(1, "blockTime");

		// TODO: could cache this object here to reduce slow calls to DB.
		const heightMappedToBlockTimestamp: Map<number, number> = new Map();
		heightMappedToBlockTimestamp.set(1, 0); // Block of height one always has a timestamp of 0

		while (nextMilestone.found && nextMilestone.height <= height) {
			// to calculate the timespan between two milestones we need to look up the timestamp of the last block
			const endSpanBlockHeight = nextMilestone.height - 1;

			heightMappedToBlockTimestamp.set(endSpanBlockHeight, await findBlockTimestampByHeight(endSpanBlockHeight));

			nextMilestone = this.configuration.getNextMilestoneWithNewKey(nextMilestone.height, "blockTime");
		}

		const result = heightMappedToBlockTimestamp.get(height);

		if (result === undefined) {
			throw new Error(
				`Attempted lookup of block height ${height} for milestone span calculation, but none exists.`,
			);
		}

		return result;
	}
}
