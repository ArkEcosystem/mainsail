import { injectable } from "@mainsail/container";

@injectable()
export class PeersGenerator {
	generate(port: number, ips: string[]): { ip: string; port: number }[] {
		return ips.map((ip) => ({
			ip,
			port,
		}));
	}
}
