import { describe, Sandbox } from "../../test-framework";
import { Prevote } from "./prevote";

describe<{
    sandbox: Sandbox;
}>("Prevote", ({ it, assert }) => {
    const prevote = new Prevote(
        1, 1, undefined,
        "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
        "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03"
    );

    it("#signature", async () => {
        assert.equal(prevote.signature, "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03");
    });

    it("#toString", async () => {
        assert.equal(
            prevote.toString(),
            `{"height":1,"round":1}`);
    });

    it("#toData", async () => {
        assert.equal(
            prevote.toData(),
            {
                height: 1,
                round: 1,
                blockId: undefined,
                signature: "b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
                validatorPublicKey: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
            }
        );
    });
});
