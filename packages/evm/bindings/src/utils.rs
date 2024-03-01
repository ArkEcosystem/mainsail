use std::str::FromStr;

use anyhow;
use napi::JsString;
use revm::primitives::Address;

pub(crate) fn create_address_from_js_string(js_str: JsString) -> anyhow::Result<Address> {
    let js_str = js_str.into_utf8()?;
    let slice = js_str.as_str()?;
    Ok(Address::from_str(slice)?)
}
