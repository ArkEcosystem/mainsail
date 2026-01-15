import { BuildPackages, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { dim, green, reset } from "kleur/colors";
import latestVersion from "latest-version";
import { lt, lte } from "semver";

import { Application } from "../application.js";
import { Confirm, Spinner, Warning } from "../components/index.js";
import { Config, Updater as Contracts_Updater } from "../contracts.js";
import { Installer } from "./installer.js";
import { ProcessManager } from "./process-manager.js";

const ONE_HOUR = 1000 * 60 * 60;

@injectable()
export class Updater implements Contracts_Updater {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	@inject(Identifiers.Cli.Config)
	private readonly config!: Config;

	@inject(Identifiers.Cli.Package)
	private readonly pkg!: Contracts.Types.PackageJson;

	@inject(Identifiers.Cli.Installer)
	private readonly installer!: Installer;

	@inject(Identifiers.Cli.ProcessManager)
	private readonly processManager!: ProcessManager;

	#updateCheckInterval: number = ONE_HOUR;

	#latestVersion: string | undefined;

	public async logStatus(): Promise<void> {
		if (await this.check()) {
			this.app
				.get<Warning>(Identifiers.Cli.Component.Warning)
				.render(
					`${reset(" An update is available")} ${dim(this.#packageVersion)} ${reset(" → ")} ${green(
						this.#latestVersion || "",
					)}. Run ${green("mainsail update")} to update to the latest version.`,
				);
		}
	}

	public async check(force?: boolean): Promise<boolean> {
		this.#latestVersion = this.config.get("latestVersion");

		if (
			!this.#latestVersion ||
			force ||
			Date.now() - this.config.get<number>("lastUpdateCheck") > this.#updateCheckInterval
		) {
			const latestVersion: string | undefined = await this.getLatestVersion();

			this.config.set("lastUpdateCheck", Date.now());

			if (latestVersion === undefined) {
				this.config.forget("latestVersion");
				return false;
			}

			this.#latestVersion = latestVersion;
			this.config.set("latestVersion", latestVersion);
		}

		return lt(this.#packageVersion, this.#latestVersion);
	}

	public async update(updateProcessManager: boolean = false, force: boolean = false): Promise<boolean> {
		if (this.#latestVersion === undefined) {
			return false;
		}

		if (!force) {
			const confirm = await this.app
				.get<Confirm>(Identifiers.Cli.Component.Confirm)
				.render(
					`Update available ${dim(this.#packageVersion)} ${reset(" → ")} ${green(
						this.#latestVersion,
					)}. Would you like to update?`,
				);

			if (!confirm) {
				throw new Error("You'll need to confirm the update to continue.");
			}
		}

		const spinner = this.app
			.get<Spinner>(Identifiers.Cli.Component.Spinner)
			.render(`Installing ${this.#latestVersion}`);

		spinner.start();

		this.installer.install(this.#packageName, BuildPackages, this.#packageChannel);

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
				.get<Warning>(Identifiers.Cli.Component.Warning)
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
