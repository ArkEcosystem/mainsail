use std::boxed::Box;

use blst::BLST_ERROR;
use blst::min_pk::{PublicKey, Signature};

use revm::context::Cfg;
use revm::context_interface::ContextTr;
use revm::handler::{EthPrecompiles, PrecompileProvider, precompile_output_to_interpreter_result};
use revm::interpreter::{CallInputs, InterpreterResult};
use revm::precompile::{PrecompileHalt, PrecompileOutput, PrecompileResult};
use revm::primitives::hardfork::SpecId;
use revm::primitives::{Address, Bytes, address};

pub const BLS_POP_VERIFY_ADDR: Address = address!("0000000000000000000000000000000001181200");

pub struct MainsailPrecompiles {
    eth: EthPrecompiles,
}

impl MainsailPrecompiles {
    pub fn new(spec: SpecId) -> Self {
        Self {
            eth: EthPrecompiles::new(spec),
        }
    }
}

impl<CTX: ContextTr> PrecompileProvider<CTX> for MainsailPrecompiles {
    type Output = InterpreterResult;

    fn set_spec(&mut self, spec: <CTX::Cfg as Cfg>::Spec) -> bool {
        PrecompileProvider::<CTX>::set_spec(&mut self.eth, spec)
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

    fn warm_addresses(&self) -> Box<impl Iterator<Item = Address>> {
        let mut addrs: Vec<Address> = self.eth.warm_addresses().collect();
        addrs.push(BLS_POP_VERIFY_ADDR);
        Box::new(addrs.into_iter())
    }

    fn contains(&self, address: &Address) -> bool {
        *address == BLS_POP_VERIFY_ADDR || self.eth.contains(address)
    }
}

/// BLS12-381 proof-of-possession verifier under the POP scheme of
/// draft-irtf-cfrg-bls-signature-05 §4.2.3.
///
/// Input  (144 B): 48-byte compressed G1 public key || 96-byte compressed G2 signature
/// Output (32 B):  0x00..01 if the PoP is valid, 0x00..00 otherwise.
///
/// Structural failures (wrong length, malformed point encoding, subgroup-check
/// failure) HALT the precompile, consuming `gas_limit` — this is intentional to
/// discourage spam with junk inputs and matches how the EIP-2537 precompiles
/// signal the same conditions. A *well-formed* but cryptographically invalid
/// PoP returns 0x00..00 at the flat `POP_VERIFY_GAS` cost.
const POP_DST: &[u8] = b"BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const POP_VERIFY_GAS: u64 = 150_000;
const PK_LEN: usize = 48;
const POP_LEN: usize = 96;
const INPUT_LEN: usize = PK_LEN + POP_LEN;

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

    let pk_bytes = &input[..PK_LEN];
    let pop_bytes = &input[PK_LEN..];

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
        false,    // already subgroup/infinity checked via sig_validate(...)
        pk_bytes, // PoP message is the compressed public key bytes
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

    /// Produce a valid PoP: sign pk_bytes under POP_DST, return the 96-byte
    /// compressed G2 signature.
    fn sign_pop(sk: &SecretKey, pk_bytes: &[u8]) -> Vec<u8> {
        sk.sign(pk_bytes, POP_DST, &[]).compress().to_vec()
    }

    fn build_input(pk: &[u8], pop: &[u8]) -> Vec<u8> {
        let mut v = Vec::with_capacity(pk.len() + pop.len());
        v.extend_from_slice(pk);
        v.extend_from_slice(pop);
        v
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

    const VALID_INPUT_LEN: usize = 48 + 96;

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
        // Sign pk_bytes under the SIG DST, then verify under POP DST.
        // This is the regression test you want if anyone ever copies the DST
        // constant from @chainsafe/bls (which uses SIG_DST).
        let (sk, pk) = keygen(1);
        let sig_dst: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
        let pop = sk.sign(&pk, sig_dst, &[]).compress().to_vec();
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
        // sk1 signs pk2_bytes under POP_DST; submit (pk2, sig). Verify against pk2
        // must fail because the sig is from sk1.
        let (sk1, _pk1) = keygen(1);
        let (_sk2, pk2) = keygen(2);
        let pop = sk1.sign(&pk2, POP_DST, &[]).compress().to_vec();
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
            .sign(&victim_pk, POP_DST, &[])
            .compress()
            .to_vec();
        let input = build_input(&victim_pk, &attempt);

        let out = bls_pop_verify(&input, POP_VERIFY_GAS, 0).expect("Ok");
        assert_invalid(&out);
    }
}
