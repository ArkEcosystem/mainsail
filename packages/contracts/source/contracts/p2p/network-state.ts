export interface NetworkState {
	readonly status: any;

	getNodeHeight(): number | undefined;
	getLastBlockId(): string | undefined;

	getQuorum();
	getOverHeightBlockHeaders();
}
