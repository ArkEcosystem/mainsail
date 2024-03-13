import { Constants } from "@mainsail/contracts";
import { createWriteStream } from "fs";
import { ensureFileSync, removeSync } from "fs-extra/esm";
import got from "got";
import stream from "stream";
import { extract } from "tar";
import { promisify } from "util";

import { AbstractSource } from "./abstract-source.js";

export class NPM extends AbstractSource {
	public constructor(paths: { data: string; temp: string }) {
		super(paths);
	}

	public async exists(value: string, version?: string): Promise<boolean> {
		try {
			await this.#getPackage(value, version);

			return true;
		} catch {
			return false;
		}
	}

	public async update(value: string): Promise<void> {
		await this.install(value);
	}

	protected async preparePackage(value: string, version?: string): Promise<void> {
		const { name, tarball }: { name: string; tarball: string } = await this.#getPackage(value, version);

		const tarballPath = `${this.tempPath}/${name}.tgz`;

		await this.#downloadPackage(tarball, tarballPath);

		await this.#extractPackage(name, tarballPath);
	}

	async #getPackage(value: string, version?: string): Promise<{ name: string; tarball: string }> {
		const registry = process.env[Constants.EnvironmentVariables.CORE_NPM_REGISTRY] || "https://registry.npmjs.org";
		const { body } = await got.default(`${registry}/${value}`);

		const response: {
			name: string;
			versions: Record<string, { tarball: string }>[];
		} = JSON.parse(body);

		if (version && !response.versions[version]) {
			throw new Error("Invalid package version");
		}

		return {
			name: response.name,
			tarball: response.versions[version || response["dist-tags"].latest].dist.tarball,
		};
	}

	async #downloadPackage(source: string, destination: string): Promise<void> {
		removeSync(destination);

		ensureFileSync(destination);

		await promisify(stream.pipeline)(got.default.stream(source), createWriteStream(destination));
	}

	async #extractPackage(name: string, file: string): Promise<void> {
		await extract({
			cwd: this.tempPath,
			file,
		});

		removeSync(file);
	}
}
