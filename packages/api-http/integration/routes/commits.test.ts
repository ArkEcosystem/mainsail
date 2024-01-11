import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import blocks from "../../test/fixtures/blocks.json";
import commit from "../../test/fixtures/commit.json";
import wallets from "../../test/fixtures/wallets.json";
import validatorRounds from "../../test/fixtures/validator-rounds.json";

describe<{
    sandbox: Sandbox;
}>("Commits", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
    let apiContext: ApiContext;

    beforeAll(async (context) => {
        nock.enableNetConnect();
        apiContext = await prepareSandbox(context);
    });

    afterAll((context) => {
        nock.disableNetConnect();
        apiContext.dispose();
    });

    beforeEach(async (context) => {
        await apiContext.reset();
        await apiContext.walletRepository.save(wallets);
    });

    afterEach(async (context) => {
        await apiContext.reset();
    });

    it("/commits/{id}", async () => {
        await apiContext.blockRepository.save(blocks);
        await apiContext.validatorRoundRepository.save(validatorRounds);

        const { statusCode, data } = await request("/commits/1");
        assert.equal(statusCode, 200);
        assert.equal(data.data, commit);
    });
});
