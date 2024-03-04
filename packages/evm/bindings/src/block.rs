use napi::JsBigInt;
use napi_derive::napi;
use revm::primitives::{Address, BlobExcessGasAndPrice, BlockEnv, B256};

use crate::utils;

#[napi(object)]
pub struct JsBlockEnv {
    pub number: JsBigInt,
    pub timestamp: JsBigInt,
    pub gas_limit: JsBigInt,
    pub basefee: JsBigInt,
    pub difficulty: JsBigInt,
}

impl TryInto<BlockEnv> for JsBlockEnv {
    type Error = anyhow::Error;

    fn try_into(mut self) -> std::result::Result<BlockEnv, Self::Error> {
        Ok(BlockEnv {
            number: utils::convert_bigint_to_u256(&mut self.number)?,
            timestamp: utils::convert_bigint_to_u256(&mut self.timestamp)?,
            gas_limit: utils::convert_bigint_to_u256(&mut self.gas_limit)?,
            basefee: utils::convert_bigint_to_u256(&mut self.basefee)?,
            difficulty: utils::convert_bigint_to_u256(&mut self.difficulty)?,

            // TODO: double check
            coinbase: Address::ZERO,
            blob_excess_gas_and_price: Some(BlobExcessGasAndPrice::new(0)),
            prevrandao: Some(B256::ZERO),
        })
    }
}
