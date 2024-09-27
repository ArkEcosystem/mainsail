use revm::primitives::{Bytes, ExecutionResult, Log};
use serde::{Deserialize, Serialize};

#[derive(Default, Clone, Serialize, Deserialize)]
pub struct TxReceipt {
    pub gas_used: u64,
    pub gas_refunded: u64,
    pub success: bool,
    pub deployed_contract_address: Option<String>,
    pub logs: Option<Vec<Log>>,
    pub output: Option<Bytes>,
}

pub fn map_execution_result(result: ExecutionResult) -> TxReceipt {
    match result {
        ExecutionResult::Success {
            gas_used,
            gas_refunded,
            output,
            logs,
            ..
        } => match output {
            revm::primitives::Output::Call(output) => TxReceipt {
                gas_used,
                gas_refunded,
                success: true,
                deployed_contract_address: None,
                logs: Some(logs),
                output: Some(output),
            },
            revm::primitives::Output::Create(output, address) => TxReceipt {
                gas_used,
                gas_refunded,
                success: true,
                deployed_contract_address: address.map(|address| address.to_string()),
                logs: Some(logs),
                output: Some(output),
            },
        },
        ExecutionResult::Revert { gas_used, output } => TxReceipt {
            gas_used,
            success: false,
            gas_refunded: 0,
            deployed_contract_address: None,
            logs: None,
            output: Some(output),
        },
        ExecutionResult::Halt { gas_used, .. } => TxReceipt {
            gas_used,
            success: false,
            gas_refunded: 0,
            deployed_contract_address: None,
            logs: None,
            output: None,
        },
    }
}
