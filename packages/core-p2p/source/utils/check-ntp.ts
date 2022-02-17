import { Container, Contracts, Utils } from "@arkecosystem/core-kernel";
import Sntp, { TimeOptions } from "@hapi/sntp";

export const checkNTP = (
	app: Contracts.Kernel.Application,
	hosts: string[],
	timeout = 1000,
): Promise<{ time: TimeOptions; host: string }> =>
	new Promise(async (resolve, reject) => {
		for (const host of Utils.shuffle(hosts)) {
			try {
				const time: Sntp.TimeOptions = await Sntp.time({
					host,
					timeout,
				});

				return resolve({ host, time });
			} catch (error) {
				app.get<Contracts.Kernel.Logger>(Container.Identifiers.LogService).error(
					`Host ${host} responded with: ${error.message}`,
				);
			}
		}

		reject(new Error("Please check your NTP connectivity, couldn't connect to any host."));
	});
