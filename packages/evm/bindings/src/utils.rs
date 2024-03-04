use std::str::FromStr;

use anyhow;
use napi::{Env, JsBigInt, JsString};
use revm::primitives::{Address, U256};

pub(crate) fn create_address_from_js_string(js_str: JsString) -> anyhow::Result<Address> {
    let js_str = js_str.into_utf8()?;
    let slice = js_str.as_str()?;
    Ok(Address::from_str(slice)?)
}

pub(crate) fn convert_u256_to_bigint(node_env: Env, value: U256) -> JsBigInt {
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

    node_env.create_bigint_from_words(false, words).unwrap()
}

pub(crate) fn convert_bigint_to_u256(bigint: &mut JsBigInt) -> anyhow::Result<U256> {
    const WORD_SIZE: usize = 8;

    let words = bigint.get_words()?;

    let mut bytes: Vec<u8> = Vec::with_capacity(bigint.word_count * WORD_SIZE);

    for word in words.1 {
        let word_bytes = word.to_le_bytes();
        bytes.extend_from_slice(&word_bytes);
    }

    assert!(bytes.len() % WORD_SIZE == 0);

    Ok(U256::from_le_slice(&bytes[..]))
}
