use blst::BLST_ERROR;
use blst::min_pk::{PublicKey, Signature};

use revm::context::Cfg;
use revm::context_interface::ContextTr;
use revm::handler::{EthPrecompiles, PrecompileProvider, precompile_output_to_interpreter_result};
use revm::interpreter::{CallInputs, InterpreterResult};
use revm::precompile::{PrecompileHalt, PrecompileOutput, PrecompileResult};
use revm::primitives::hardfork::SpecId;
use revm::primitives::{Address, AddressSet, Bytes, address};

pub const BLS_POP_VERIFY_ADDR: Address = address!("0000000000000000000000000000000001181200");

pub struct MainsailPrecompiles {
    eth: EthPrecompiles,
    warm_addresses: AddressSet,
}

impl MainsailPrecompiles {
    pub fn new(spec: SpecId) -> Self {
        let eth = EthPrecompiles::new(spec);
        let warm_addresses = Self::warm_addresses_for(&eth);

        Self {
            eth,
            warm_addresses,
        }
    }

    fn warm_addresses_for(eth: &EthPrecompiles) -> AddressSet {
        let mut warm_addresses = eth.warm_addresses().clone();
        warm_addresses.insert(BLS_POP_VERIFY_ADDR);
        warm_addresses
    }
}

impl<CTX: ContextTr> PrecompileProvider<CTX> for MainsailPrecompiles {
    type Output = InterpreterResult;

    fn set_spec(&mut self, spec: <CTX::Cfg as Cfg>::Spec) -> bool {
        let changed = PrecompileProvider::<CTX>::set_spec(&mut self.eth, spec);
        if changed {
            // `eth` swapped to the new spec's precompile set and needs a rebuild.
            self.warm_addresses = Self::warm_addresses_for(&self.eth);
        }
        changed
    }

    fn run(
        &mut self,
        context: &mut CTX,
        inputs: &CallInputs,
    ) -> Result<Option<InterpreterResult>, String> {
        if inputs.bytecode_address == BLS_POP_VERIFY_ADDR {
            let input_bytes = inputs.input.as_bytes(context);
            let output = bls_pop_verify(&input_bytes, inputs.gas_limit, inputs.reservoir)
                .map_err(|e| e.to_string())?;
            let result = precompile_output_to_interpreter_result(output, inputs.gas_limit);
            return Ok(Some(result));
        }

        // Fall through to the standard mainnet precompiles for everything else.
        PrecompileProvider::<CTX>::run(&mut self.eth, context, inputs)
    }

    fn warm_addresses(&self) -> &AddressSet {
        &self.warm_addresses
    }

    fn contains(&self, address: &Address) -> bool {
        *address == BLS_POP_VERIFY_ADDR || self.eth.contains(address)
    }
}

/// BLS12-381 proof-of-possession verifier under the POP scheme of
/// draft-irtf-cfrg-bls-signature-05 §4.2.3.
///
/// Input  (196 B): 32-byte chain id || 20-byte registrant address ||
///                 48-byte compressed G1 public key || 96-byte compressed G2 signature
/// Output (32 B):  0x00..01 if the PoP is valid, 0x00..00 otherwise.
///
/// Structural failures (wrong length, malformed point encoding, subgroup-check
/// failure) HALT the precompile, consuming `gas_limit` — this is intentional to
/// discourage spam with junk inputs and matches how the EIP-2537 precompiles
/// signal the same conditions. A *well-formed* but cryptographically invalid
/// PoP returns 0x00..00 at the flat `POP_VERIFY_GAS` cost.
const POP_DST: &[u8] = b"MAINSAIL_BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const POP_VERIFY_GAS: u64 = 150_000;
const BINDING_LEN: usize = 32 + 20;
const PK_LEN: usize = 48;
const POP_LEN: usize = 96;
const MESSAGE_LEN: usize = BINDING_LEN + PK_LEN;
const INPUT_LEN: usize = MESSAGE_LEN + POP_LEN;

fn bls_pop_verify(input: &[u8], gas_limit: u64, reservoir: u64) -> PrecompileResult {
    if gas_limit < POP_VERIFY_GAS {
        return Ok(PrecompileOutput::halt(PrecompileHalt::OutOfGas, reservoir));
    }
    if input.len() != INPUT_LEN {
        return Ok(PrecompileOutput::halt(
            PrecompileHalt::other_static("bls_pop: bad input length"),
            reservoir,
        ));
    }

    let message = &input[..MESSAGE_LEN];
    let pk_bytes = &input[BINDING_LEN..MESSAGE_LEN];
    let pop_bytes = &input[MESSAGE_LEN..];

    let pk = match PublicKey::key_validate(pk_bytes) {
        Ok(p) => p,
        Err(_) => {
            return Ok(PrecompileOutput::halt(
                PrecompileHalt::Bls12381G1NotInSubgroup,
                reservoir,
            ));
        }
    };

    let sig = match Signature::sig_validate(pop_bytes, true) {
        Ok(s) => s,
        Err(_) => {
            return Ok(PrecompileOutput::halt(
                PrecompileHalt::Bls12381G2NotInSubgroup,
                reservoir,
            ));
        }
    };

    let res = sig.verify(
        false,   // already subgroup/infinity checked via sig_validate(...)
        message, // PoP message is chain id || registrant address || compressed public key bytes
        POP_DST,
        &[],
        &pk,
        false, // already key-validated via key_validate(...)
    );

    let mut out = [0u8; 32];
    if res == BLST_ERROR::BLST_SUCCESS {
        out[31] = 1;
    }

    Ok(PrecompileOutput::new(
        POP_VERIFY_GAS,
        Bytes::from(out.to_vec()),
        reservoir,
    ))
}

#[cfg(test)]
mod tests {
    use blst::min_pk::SecretKey;
    use revm::precompile::{PrecompileHalt, PrecompileOutput, PrecompileStatus};

    use crate::precompiles::{POP_DST, POP_VERIFY_GAS, bls_pop_verify};

    #[test]
    fn test_set_spec_rebuilds_warm_addresses() {
        use revm::MainContext;
        use revm::context::Cfg;
        use revm::context_interface::ContextTr;
        use revm::handler::{EthPrecompiles, PrecompileProvider};
        use revm::primitives::AddressSet;
        use revm::primitives::hardfork::SpecId;

        use crate::precompiles::{BLS_POP_VERIFY_ADDR, MainsailPrecompiles};

        fn set_spec<CTX: ContextTr>(_ctx: &CTX, p: &mut MainsailPrecompiles, spec: SpecId) -> bool
        where
            CTX::Cfg: Cfg<Spec = SpecId>,
        {
            PrecompileProvider::<CTX>::set_spec(p, spec)
        }

        fn warm<CTX: ContextTr>(_ctx: &CTX, p: &MainsailPrecompiles) -> AddressSet {
            PrecompileProvider::<CTX>::warm_addresses(p).clone()
        }

        let expected = |spec: SpecId| -> AddressSet {
            let mut set = EthPrecompiles::new(spec).warm_addresses().clone();
            set.insert(BLS_POP_VERIFY_ADDR);
            set
        };

        // Prague activates EIP-2537; the specs must differ for this test to be meaningful.
        assert_ne!(expected(SpecId::SHANGHAI), expected(SpecId::PRAGUE));

        let ctx = revm::Context::mainnet();
        let mut precompiles = MainsailPrecompiles::new(SpecId::SHANGHAI);
        assert_eq!(warm(&ctx, &precompiles), expected(SpecId::SHANGHAI));

        // Same spec: no change reported, snapshot untouched.
        assert!(!set_spec(&ctx, &mut precompiles, SpecId::SHANGHAI));
        assert_eq!(warm(&ctx, &precompiles), expected(SpecId::SHANGHAI));

        // Spec bump: the snapshot must follow the new precompile set — otherwise newly
        // activated precompiles are charged cold access (EIP-2929), a consensus divergence.
        assert!(set_spec(&ctx, &mut precompiles, SpecId::PRAGUE));
        assert_eq!(warm(&ctx, &precompiles), expected(SpecId::PRAGUE));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /// Deterministic keygen for reproducible tests. The seed byte distinguishes
    /// independent key pairs without bringing in a CSPRNG.
    fn keygen(seed: u8) -> (SecretKey, Vec<u8>) {
        let mut ikm = [0u8; 32];
        ikm[0] = seed;
        for i in 1..32 {
            ikm[i] = seed.wrapping_mul(i as u8).wrapping_add(0xa5);
        }
        let sk = SecretKey::key_gen(&ikm, &[]).expect("keygen");
        let pk_bytes = sk.sk_to_pk().compress().to_vec();
        (sk, pk_bytes)
    }

    const CHAIN_ID: u64 = 10_000;
    const REGISTRANT_ADDRESS: [u8; 20] = [0x22; 20];

    fn binding(chain_id: u64, registrant_address: &[u8]) -> Vec<u8> {
        let mut v = vec![0u8; 24];
        v.extend_from_slice(&chain_id.to_be_bytes());
        v.extend_from_slice(registrant_address);
        v
    }

    fn message(pk_bytes: &[u8]) -> Vec<u8> {
        [binding(CHAIN_ID, &REGISTRANT_ADDRESS), pk_bytes.to_vec()].concat()
    }

    /// Produce a valid PoP: sign the bound message under POP_DST, return the 96-byte
    /// compressed G2 signature.
    fn sign_pop(sk: &SecretKey, pk_bytes: &[u8]) -> Vec<u8> {
        sk.sign(&message(pk_bytes), POP_DST, &[])
            .compress()
            .to_vec()
    }

    fn build_input_with(binding: &[u8], pk: &[u8], pop: &[u8]) -> Vec<u8> {
        [binding, pk, pop].concat()
    }

    fn build_input(pk: &[u8], pop: &[u8]) -> Vec<u8> {
        build_input_with(&binding(CHAIN_ID, &REGISTRANT_ADDRESS), pk, pop)
    }

    /// Assert the precompile returned 32 bytes of 0x..01 (valid PoP).
    fn assert_valid(out: &PrecompileOutput) {
        assert_eq!(out.status, PrecompileStatus::Success, "expected Success");
        assert_eq!(out.bytes.len(), 32);
        assert_eq!(out.bytes[..31], [0u8; 31][..]);
        assert_eq!(out.bytes[31], 0x01, "expected last byte = 0x01");
    }

    /// Assert the precompile returned 32 bytes of zero (well-formed input, sig invalid).
    fn assert_invalid(out: &PrecompileOutput) {
        assert_eq!(out.status, PrecompileStatus::Success, "expected Success");
        assert_eq!(out.bytes.len(), 32);
        assert_eq!(out.bytes[..], [0u8; 32][..], "expected all-zero output");
    }

    /// Assert the precompile halted with the specific reason.
    fn assert_halt(out: &PrecompileOutput, expected: &PrecompileHalt) {
        match &out.status {
            PrecompileStatus::Halt(reason) => assert_eq!(reason, expected),
            other => panic!("expected Halt({:?}), got {:?}", expected, other),
        }
    }

    const VALID_INPUT_LEN: usize = 32 + 20 + 48 + 96;

    // ── Happy path ─────────────────────────────────────────────────────────

    #[test]
    fn round_trip_valid_pop() {
        let (sk, pk) = keygen(1);
        let pop = sign_pop(&sk, &pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_valid(&out);
    }

    #[test]
    fn round_trip_many_keys() {
        // Sweep a handful of distinct keys to catch any accidental coupling.
        for seed in 1u8..=8 {
            let (sk, pk) = keygen(seed);
            let pop = sign_pop(&sk, &pk);
            let input = build_input(&pk, &pop);

            let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
            assert_valid(&out);
        }
    }

    // ── Gas accounting ─────────────────────────────────────────────────────

    #[test]
    fn out_of_gas() {
        let (sk, pk) = keygen(1);
        let pop = sign_pop(&sk, &pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS - 1, 0).expect("Ok");
        assert_halt(&out, &PrecompileHalt::OutOfGas);
    }

    #[test]
    fn exact_gas_succeeds() {
        let (sk, pk) = keygen(1);
        let pop = sign_pop(&sk, &pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_valid(&out);
        // Successful path bills the full POP_VERIFY_GAS.
        assert_eq!(out.gas_used, POP_VERIFY_GAS);
    }

    // ── Input length guards ────────────────────────────────────────────────

    #[test]
    fn input_empty() {
        let out = bls_pop_verify(&[], POP_VERIFY_GAS, 0).expect("Ok");
        assert!(matches!(out.status, PrecompileStatus::Halt(_)));
    }

    #[test]
    fn input_one_byte_short() {
        let input = vec![0u8; VALID_INPUT_LEN - 1];
        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert!(matches!(out.status, PrecompileStatus::Halt(_)));
    }

    #[test]
    fn input_one_byte_long() {
        let input = vec![0u8; VALID_INPUT_LEN + 1];
        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert!(matches!(out.status, PrecompileStatus::Halt(_)));
    }

    // ── Malformed public key (G1) ──────────────────────────────────────────

    #[test]
    fn pk_garbage_not_on_curve() {
        // 48 random-looking bytes — vanishingly unlikely to decode to a valid G1 point.
        let pk = [0xff; 48];
        let (sk, real_pk) = keygen(1);
        let pop = sign_pop(&sk, &real_pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_halt(&out, &PrecompileHalt::Bls12381G1NotInSubgroup);
    }

    #[test]
    fn pk_infinity_rejected_by_validate() {
        // Compressed G1 point-at-infinity: byte 0 has compression bit (0x80) and
        // infinity bit (0x40) set; everything else zero.
        let mut pk = vec![0u8; 48];
        pk[0] = 0xc0;
        let (sk, real_pk) = keygen(1);
        let pop = sign_pop(&sk, &real_pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        // from_bytes accepts infinity; validate() rejects it (KeyValidate forbids 1_G1).
        assert_halt(&out, &PrecompileHalt::Bls12381G1NotInSubgroup);
    }

    #[test]
    fn pk_uncompressed_encoding_rejected() {
        // Uncompressed encoding has the compression bit unset → from_bytes rejects.
        let mut pk = vec![0u8; 48];
        pk[0] = 0x00;
        let (sk, real_pk) = keygen(1);
        let pop = sign_pop(&sk, &real_pk);
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_halt(&out, &PrecompileHalt::Bls12381G1NotInSubgroup);
    }

    // ── Malformed signature (G2) ───────────────────────────────────────────

    #[test]
    fn sig_garbage_not_on_curve() {
        let (_, pk) = keygen(1);
        let pop = [0xff; 96];
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_halt(&out, &PrecompileHalt::Bls12381G2NotInSubgroup);
    }

    #[test]
    fn sig_infinity_rejected_by_validate() {
        let (_, pk) = keygen(1);
        // Compressed G2 point-at-infinity: 0xc0 || 95 × 0x00.
        let mut pop = vec![0u8; 96];
        pop[0] = 0xc0;
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_halt(&out, &PrecompileHalt::Bls12381G2NotInSubgroup);
    }

    // ── Cryptographic failures — well-formed, just wrong ───────────────────

    #[test]
    fn wrong_dst_used_for_signing() {
        // Sign the bound message under the SIG DST, then verify under POP DST.
        // This is the regression test you want if anyone ever copies the DST
        // constant from @chainsafe/bls (which uses SIG_DST).
        let (sk, pk) = keygen(1);
        let sig_dst: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
        let pop = sk.sign(&message(&pk), sig_dst, &[]).compress().to_vec();
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn wrong_message_signed() {
        // Sign 48 bytes of zeros under POP_DST; submit (real_pk, sig).
        // The sig is valid under POP_DST, just for the wrong message.
        let (sk, pk) = keygen(1);
        let zeros = [0u8; 48];
        let pop = sk.sign(&zeros, POP_DST, &[]).compress().to_vec();
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn pk_substituted_at_input() {
        // Build a valid (pk1, pop1) pair, then submit (pk2, pop1).
        let (sk1, pk1) = keygen(1);
        let (_sk2, pk2) = keygen(2);
        let pop1 = sign_pop(&sk1, &pk1);
        let input = build_input(&pk2, &pop1);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn pop_signed_by_different_key() {
        // sk1 signs pk2's bound message under POP_DST; submit (pk2, sig). Verify against pk2
        // must fail because the sig is from sk1.
        let (sk1, _pk1) = keygen(1);
        let (_sk2, pk2) = keygen(2);
        let pop = sk1.sign(&message(&pk2), POP_DST, &[]).compress().to_vec();
        let input = build_input(&pk2, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn pop_reuse_across_keys_fails() {
        // The textbook PoP property: a PoP for pk1 is not a PoP for pk2.
        // Even if both are produced by honest signers, you can't claim one as the other.
        let (sk1, pk1) = keygen(1);
        let (_sk2, pk2) = keygen(2);
        let pop_for_pk1 = sign_pop(&sk1, &pk1);
        let input = build_input(&pk2, &pop_for_pk1);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    // ── Binding ────────────────────────────────────────────────────────────

    #[test]
    fn pop_is_bound_to_the_registrant_address() {
        let (sk, pk) = keygen(1);
        let pop = sign_pop(&sk, &pk);
        let input = build_input_with(&binding(CHAIN_ID, &[0x33; 20]), &pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn pop_is_bound_to_the_chain_id() {
        let (sk, pk) = keygen(1);
        let pop = sign_pop(&sk, &pk);
        let input = build_input_with(&binding(CHAIN_ID + 1, &REGISTRANT_ADDRESS), &pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn verifies_the_pop_built_by_the_typescript_builder() {
        // Pinned vector from build-proof-of-possession.test.ts.
        use revm::primitives::hex;

        let pk = hex::decode("a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d").unwrap();
        let pop = hex::decode("a892e94d8ed6d0fe8792dcb31b7c5116a7d138ad4bbbd044780a7c314e86673e783850121dc34d0edfa2a2560c2f30a402f4fa5106ff71d5c69bc3027210ef90b3d3ae0a19ffc9f554b37aca72f3bb25788c3177514d94e041441ba9d029b3ba").unwrap();
        let registrant_address = hex::decode("75545540230d5c3BEf023202d23CB74cFA723376").unwrap();
        let input = build_input_with(&binding(10_000, &registrant_address), &pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_valid(&out);
    }

    #[test]
    fn unbound_ietf_pop_is_rejected() {
        let (sk, pk) = keygen(1);
        let ietf_pop_dst: &[u8] = b"BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
        let pop = sk.sign(&pk, ietf_pop_dst, &[]).compress().to_vec();
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }

    #[test]
    fn tampered_signature_last_byte_fails() {
        let (sk, pk) = keygen(1);
        let mut pop = sign_pop(&sk, &pk);
        pop[95] ^= 1; // flip the lowest bit
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        // Either the modified point is off-curve (halt) or on-curve but invalid (0x..00).
        // Both outcomes are acceptable; what matters is it's not 0x..01.
        match out.status {
            PrecompileStatus::Success => assert_invalid(&out),
            PrecompileStatus::Halt(_) => {}
            other => panic!("unexpected status: {:?}", other),
        }
    }

    #[test]
    fn tampered_pk_low_bit_fails() {
        let (sk, real_pk) = keygen(1);
        let pop = sign_pop(&sk, &real_pk);
        let mut pk = real_pk.clone();
        pk[47] ^= 1;
        let input = build_input(&pk, &pop);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        match out.status {
            PrecompileStatus::Success => assert_invalid(&out),
            PrecompileStatus::Halt(_) => {}
            other => panic!("unexpected status: {:?}", other),
        }
    }

    #[test]
    fn attacker_cannot_self_pop_a_key_they_dont_control() {
        // Take a public key we know the secret for, and try to PoP it by signing with a *different* key.
        // The PoP must fail. This is the load-bearing property of the POP scheme.
        let (sk_attacker, _) = keygen(99);
        let (_, victim_pk) = keygen(2);
        let attempt = sk_attacker
            .sign(&message(&victim_pk), POP_DST, &[])
            .compress()
            .to_vec();
        let input = build_input(&victim_pk, &attempt);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }
}
