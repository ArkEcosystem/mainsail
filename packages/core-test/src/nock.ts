import base, { Options, Scope } from "nock";

export const nock = {
	cleanAll: base.cleanAll,
	disableNetConnect: base.disableNetConnect,
	enableNetConnect: base.enableNetConnect,
	fake: (basePath?: string | RegExp, options?: Options): Scope => base(basePath ?? /.+/, options),
};
