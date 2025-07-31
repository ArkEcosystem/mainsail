use anyhow;
use mainsail_evm_core::legacy::LegacyAddress;
use napi::bindgen_prelude::{BigInt, Buffer};
use revm::primitives::{Address, B256, Bytes, U256};
use std::str::FromStr;

pub(crate) fn create_address_from_string(str: &str) -> anyhow::Result<Address> {
    Ok(Address::from_str(str)?)
}

pub(crate) fn create_legacy_address_from_string(str: &str) -> anyhow::Result<LegacyAddress> {
    LegacyAddress::try_from(str).map_err(|err| anyhow::anyhow!("legacy address parse: {:?}", err))
}

pub(crate) fn convert_js_buffer_to_bytes(buffer: Buffer) -> Bytes {
    Bytes::from_iter(buffer.as_ref())
}

pub(crate) fn convert_string_to_b256(str: String) -> anyhow::Result<B256> {
    Ok(B256::try_from(
        &Bytes::from_str(str.as_str())?.as_ref()[..],
    )?)
}

pub(crate) fn convert_bigint_to_u256(bigint: BigInt) -> anyhow::Result<U256> {
    let bytes: Vec<u8> = bigint
        .words
        .iter()
        .flat_map(|word| word.to_le_bytes())
        .collect();

    U256::try_from_le_slice(&bytes[..]).ok_or_else(|| anyhow::anyhow!("invalid bigint"))
}

pub(crate) fn convert_bytes_to_js_buffer(bytes: Bytes) -> Buffer {
    Into::<Vec<u8>>::into(bytes).into()
}

pub(crate) fn convert_u256_to_bigint(value: U256) -> BigInt {
    let slice = value.as_le_slice();

    const WORD_SIZE: usize = 8;
    assert!(slice.len() % WORD_SIZE == 0);

    // https://nodejs.org/api/n-api.html#n_api_napi_create_bigint_words
    let mut words: Vec<u64> = Vec::with_capacity(slice.len() / WORD_SIZE);
    for chunk in slice.chunks_exact(WORD_SIZE) {
        let mut bytes = [0; 8];
        bytes.copy_from_slice(chunk);
        words.push(u64::from_le_bytes(bytes));
    }

    BigInt {
        words,
        sign_bit: false,
    }
}
