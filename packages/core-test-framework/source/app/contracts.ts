import { interfaces } from "@arkecosystem/core-container";
import { Application } from "@arkecosystem/core-kernel";

export type SandboxCallback = (context: { app: Application; container: interfaces.Container }) => void;
