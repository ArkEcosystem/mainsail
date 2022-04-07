import { injectable } from "@arkecosystem/core-container";

@injectable()
export class PeersGenerator {
	generate(port: number, ips: string[]): { ip: string; port: number }[] {
		return ips.map((ip) => ({
			ip,
			port,
		}));
	}
}
