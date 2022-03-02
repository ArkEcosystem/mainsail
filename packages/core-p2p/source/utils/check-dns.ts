import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import dns from "dns";
import util from "util";

export const checkDNS = async (app: Contracts.Kernel.Application, hosts: string[]) => {
	hosts = Utils.shuffle(hosts);

	const lookupService = util.promisify(dns.lookupService);

	for (let index = hosts.length - 1; index >= 0; index--) {
		try {
			await lookupService(hosts[index], 53);

			return Promise.resolve(hosts[index]);
		} catch (error) {
			app.get<Contracts.Kernel.Logger>(Identifiers.LogService).error(error.message);
		}
	}

	return Promise.reject(new Error("Please check your network connectivity, couldn't connect to any host."));
};
