import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { dim, green, reset } from "kleur";
import latestVersion from "latest-version";
import { lt, lte } from "semver";

import { Application } from "../application";
import { Confirm, Spinner, Warning } from "../components";
import { Config, Updater as Contracts_Updater } from "../contracts";
import { Identifiers } from "../ioc";
import { Installer } from "./installer";
import { ProcessManager } from "./process-manager";

const ONE_HOUR = 1000 * 60 * 60;

@injectable()
export class Updater implements Contracts_Updater {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.Config)
	private readonly config!: Config;

	@inject(Identifiers.Package)
	private readonly pkg!: Contracts.Types.PackageJson;

	@inject(Identifiers.Installer)
	private readonly installer!: Installer;

	@inject(Identifiers.ProcessManager)
	private readonly processManager!: ProcessManager;

	#updateCheckInterval: number = ONE_HOUR;

	#latestVersion: string | undefined;

	public async check(force?: boolean): Promise<boolean> {
		this.#latestVersion = this.config.get("latestVersion");

		if (
			this.#latestVersion &&
			!force &&
			Date.now() - this.config.get<number>("lastUpdateCheck") < this.#updateCheckInterval
		) {
			// Update is available if last seen is greater than latest.
			return lt(this.#packageVersion, this.#latestVersion);
		}

		const latestVersion: string | undefined = await this.getLatestVersion();

		this.config.set("lastUpdateCheck", Date.now());

		if (latestVersion === undefined) {
			this.config.forget("latestVersion");
			return false;
		}

		this.config.set("latestVersion", latestVersion);

		this.#latestVersion = latestVersion;

		return true;
	}

	public async update(updateProcessManager = false, force = false): Promise<boolean> {
		if (this.#latestVersion === undefined) {
			return false;
		}

		if (!force) {
			const confirm = await this.app
				.get<Confirm>(Identifiers.Confirm)
				.render(
					`Update available ${dim(this.#packageVersion)} ${reset(" → ")} ${green(
						this.#latestVersion,
					)}. Would you like to update?`,
				);

			if (!confirm) {
				throw new Error("You'll need to confirm the update to continue.");
			}
		}

		const spinner = this.app.get<Spinner>(Identifiers.Spinner).render(`Installing ${this.#latestVersion}`);

		spinner.start();

		this.installer.install(this.#packageName, this.#packageChannel);

		if (updateProcessManager) {
			this.processManager.update();
		}

		spinner.succeed();

		return true;
	}

	public async getLatestVersion(): Promise<string | undefined> {
		try {
			const latest: string | undefined = await latestVersion(this.#packageName, {
				version: this.#packageChannel,
			});

			if (lte(latest, this.#packageVersion)) {
				return undefined;
			}

			return latest;
		} catch {
			this.app
				.get<Warning>(Identifiers.Warning)
				.render(`We were unable to find any releases for the "${this.#packageChannel}" channel.`);

			return undefined;
		}
	}

	get #packageName(): string {
		return this.pkg.name ?? "";
	}

	get #packageVersion(): string {
		return this.pkg.version ?? "";
	}

	get #packageChannel(): string {
		return this.config.get("channel");
	}
}
