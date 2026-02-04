import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { Signature } from "./signature";
import { NotImplemented } from "@mainsail/exceptions";

const privateKeys = [
	"3325023a5e4e0069558c5bd9eb7eca78b4f4c7711b9b231d9263a8edc33bc510",
	"261932eab11daf31dad5eebfc093404e749b8b4e18f2588b81af7d76e0e59bbf",
	"48a37c7a4d15910fc7b607008820dea0cd24fa8915dfc011aa8416e10cc157cf",
	"61c03c88a5b24406bd9d5e9361103d6ccbd91b0a4429cbfe32db10c182877e62",
]

const precompiledSignatures = [
	'8a61e2b9734c614c031362a2c810d2172776460b83cc23bb0ba8a7a42ef8da5ab4d4e102cc76217ec109e10d4be383a619c27ea533668b879c71eff22e1b11740a592afebc4303277c4fe0751f6071914ac75762f1f581bf0d7cd2389f5d8e0c',
	'90941499cd4d2eba77900ce7a5bc451aa3a3ee882b28c0da1cc9c510dfa1822767121ac07076f9b21cc1491fc77a4db111525bc0f4b1c3c95c679485038094fdd0838613775c3b870c1951e567594d9ab7cfb749eeafa06b06182e0c099d12ba',
	'b5be7ea7ac545345ec132d42d0d8877d08acad64efcbd880eeda85e6a31caff289d2fbe9be102cb6d664301a1bf47e15178bbcb06735b652dd21a2795944f97136579d06232af2a8c0f593a981778a0d43b4e46d6d78ad081e4bd110d7cb3c06',
	'ae576b8f8c36886dfaba079d73631b49736c71a7c06fadc77596c646c8a5d9975167e4bb0d871fdec2d2d91d45134c2f11d74885ad6778dea89a69111f7b8a3eb89342e9f4c1bd9735d5976dd160cdfe96b17845087a653ab4628695d1982ef3'
];

const aggregated0123 = "8d838b6a18f6da7ab62b486732cfbff4433396a5f9d31b4015e23e78f1c775744d66916d2dacf00b9b7bef2f2c3f4db111c9d823d11c40e0b1d626d214531851f4f220c7b65d3210a1702698c984bf48637b592265a1de0dda2d7cbf3f6e7610";
const aggregated012 = "a12131a9fdf745a5dbd44115a009c2782d4d4a7c5ffc9cdacc2888cacbe2d36c6e77083b1f450fa17c1a89b7551583a00774acece6b5b70011eba5e12ca0e031891c849f73be3c4106e6375e0eeeeca7f5aed0fbac1957cbf2f369a1807e3eb8";
const aggregated01 = "88a9d2a6573c38c76304dc12b396a8faca1ed67dfc70f45003764bc99faec403e6a97050ffbbd58f2efb7bd795b5e0640ddef025464bdeee46199d6da6c700b8a0944a6e3a78620b1eaabf26d233b48039394bf1484c827e686c2c7a2af38017";
const aggregated12 = "85259152f347ada143d2b9854f1fc3a5485e607185aa7c41e4ae3d2c1245515eb9306f9240a8cd0b159d80b262bad974132787f8555fbce43435efbd4a9a0369b977e87d3228878c8e7cccf6e905d3d9434490e4830ec3a7aff614842bbdd4c0";
const aggregated13 = "a45dd94dfd70bf1a79671b623a471b5f67178912ad4d23365a5f03b8a43c9f22788de96707ec0521e4f14a580b763b3218c841b5fa491fd6cae5ea0a2d864afa031bdc45fea6d0265d82eecaa254ab501c72ec24deee793e39db6e86ddd34f49";

describe<{
	app: Application;
	signature: Signature;
}>("Signature", ({ beforeEach, assert, it }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.signature = context.app.resolve(Signature);
	});

	it("should sign", async ({ signature }) => {
		const signatures = await Promise.all(privateKeys.map((pk) =>
			signature.sign(
				Buffer.from("64726e3da8", "hex"),
				Buffer.from(pk, "hex"),
			),
		));

		for (let i = 0; i < signatures.length; i++) {
			assert.equal(signatures[i], precompiledSignatures[i]);
		}
	});

	it("should sign and verify", async ({ signature }) => {
		assert.true(
			await signature.verify(
				Buffer.from(
					await signature.sign(
						Buffer.from("64726e3da8", "hex"),
						Buffer.from("67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c", "hex"),
					),
					"hex",
				),
				Buffer.from("64726e3da8", "hex"),
				Buffer.from(
					"a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d",
					"hex",
				),
			),
		);
	});

	it("#aggregate - should throw if no signatures are provided", async ({ signature }) => {
		await assert.rejects(() => signature.aggregate([]));
	});

	it("#aggregate - should keep single signature if only one is provided", async ({ signature }) => {
		const signatures = precompiledSignatures.map((sig) => Buffer.from(sig, "hex"));

		const result = await signature.aggregate([signatures[0]]);
		assert.equal(result, precompiledSignatures[0]);
	});

	it("#aggregate - should keep same result if order is changed", async ({ signature }) => {
		const signatures = precompiledSignatures.map((sig) => Buffer.from(sig, "hex"));

		const resultAsc = await signature.aggregate([signatures[0], signatures[1], signatures[2], signatures[3]]);
		const resultDesc = await signature.aggregate([signatures[3], signatures[2], signatures[1], signatures[0]]);
		assert.equal(resultAsc, resultDesc);
		assert.equal(resultAsc, aggregated0123);
	});

	it("#aggregate - should be different for different inputs", async ({ signature }) => {
		const signatures = precompiledSignatures.map((sig) => Buffer.from(sig, "hex"));

		const result0123 = await signature.aggregate([signatures[0], signatures[1], signatures[2], signatures[3]]);
		assert.equal(result0123, aggregated0123);

		const result012 = await signature.aggregate([signatures[0], signatures[1], signatures[2]]);
		assert.equal(result012, aggregated012);

		const result01 = await signature.aggregate([signatures[0], signatures[1]]);
		assert.equal(result01, aggregated01);

		const result12 = await signature.aggregate([signatures[1], signatures[2]]);
		assert.equal(result12, aggregated12);

		const result13 = await signature.aggregate([signatures[1], signatures[3]]);
		assert.equal(result13, aggregated13);
	});

	it("#signRecoverable - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.signRecoverable(Buffer.from(""), Buffer.from("")), NotImplemented);
	});

	it("#verifyRecoverable - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.verifyRecoverable({ r: "", s: "", v: 0 }, Buffer.from(""), Buffer.from("")), NotImplemented);
	});

	it("#recoverPublicKey - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.recoverPublicKey(Buffer.from(""), { r: "", s: "", v: 0 }), NotImplemented);
	});
});
