import { interfaces } from "@mainsail/container";
import { Application } from "@mainsail/kernel";

export type SandboxCallback = (context: { app: Application; container: interfaces.Container }) => void;
