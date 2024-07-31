use std::str::FromStr;

use anyhow;
use napi::{JsBigInt, JsString};
use revm::primitives::{Address, Bytes, B256, U256};

pub(crate) fn create_address_from_js_string(js_str: JsString) -> anyhow::Result<Address> {
    let js_str = js_str.into_utf8()?;
    let slice = js_str.as_str()?;
    Ok(Address::from_str(slice)?)
}

pub(crate) fn convert_string_to_b256(js_str: JsString) -> anyhow::Result<B256> {
    Ok(B256::try_from(
        &Bytes::from_str(js_str.into_utf8()?.as_str()?)?.as_ref()[..],
    )?)
}

pub(crate) fn convert_bigint_to_u256(mut js_bigint: JsBigInt) -> anyhow::Result<U256> {
    let (_, words) = js_bigint.get_words()?;

    let bytes: Vec<u8> = words.iter().flat_map(|word| word.to_le_bytes()).collect();

    U256::try_from_le_slice(&bytes[..]).ok_or_else(|| anyhow::anyhow!("invalid bigint"))
}

pub(crate) fn convert_u256_to_bigint(
    node_env: &napi::Env,
    value: U256,
) -> anyhow::Result<JsBigInt> {
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

    Ok(node_env.create_bigint_from_words(false, words)?)
}
