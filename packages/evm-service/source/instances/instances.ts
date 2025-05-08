import { injectable, injectFromBase } from "@mainsail/container";

import { EvmInstance } from "./evm.js";

@injectable()
@injectFromBase()
export class MainEvm extends EvmInstance {}

@injectable()
@injectFromBase()
export class ValidatorEvm extends EvmInstance {}

@injectable()
@injectFromBase()
export class TransactionPoolEvm extends EvmInstance {}

@injectable()
@injectFromBase()
export class RpcEvm extends EvmInstance {}
