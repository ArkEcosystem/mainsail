use revm::{
    context::result::{ExecutionResult, Output},
    primitives::{Bytes, Log},
};
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct TxReceipt {
    pub gas_used: u64,
    pub cumulative_gas_used: u64,
    pub gas_refunded: u64,
    pub success: u8,
    pub contract_address: Option<String>,
    pub logs: Option<Vec<Log>>,
    pub output: Option<Bytes>,
}

pub fn map_execution_result(result: ExecutionResult, cumulative_gas_used: u64) -> TxReceipt {
    match result {
        ExecutionResult::Success {
            gas_used,
            gas_refunded,
            output,
            logs,
            ..
        } => match output {
            Output::Call(output) => TxReceipt {
                gas_used,
                gas_refunded,
                cumulative_gas_used,
                success: 1,
                contract_address: None,
                logs: Some(logs),
                output: Some(output),
            },
            Output::Create(output, address) => TxReceipt {
                gas_used,
                gas_refunded,
                cumulative_gas_used,
                success: 1,
                contract_address: address.map(|address| address.to_string()),
                logs: Some(logs),
                output: Some(output),
            },
        },
        ExecutionResult::Revert { gas_used, output } => TxReceipt {
            gas_used,
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: Some(output),
        },
        ExecutionResult::Halt { gas_used, .. } => TxReceipt {
            gas_used,
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: None,
        },
    }
}
