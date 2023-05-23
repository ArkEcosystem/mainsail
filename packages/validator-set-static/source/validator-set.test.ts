import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../test-framework";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { ValidatorSet } from "./validator-set";

describe<{
    sandbox: Sandbox;
    validatorSet: ValidatorSet;
}>("ValidatorSet", ({ it, assert, beforeEach }) => {
    beforeEach(async (context) => {
        await prepareSandbox(context);

        context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.ConfigRepository)
            .set("validators.secrets", [
                "endless deposit bright clip school doctor later surround strategy blouse damage drink diesel erase scrap inside over pledge talent blood bus luggage glad whale",
                "number hero hen release sock solution powder front museum dignity tell invest turkey blast arrest resemble program rule grace card dash error fat fog",
            ]);

        context.validatorSet = await context.sandbox.app.resolve(ValidatorSet).configure();
    });

    it("#getActiveValidators - should return active validators", async ({ validatorSet }) => {
        const validators = await validatorSet.getActiveValidators();
        assert.equal(validators.length, 2);
    });
});
