// The seed addresses from peers.json and the configured sources. Loaded once at boot; seeds are
// exempt from the subnet limit and are accepted even when discovery is disabled.
export interface Seeds {
	load(): Promise<void>;
	all(): string[];
	isSeed(ip: string): boolean;
}
