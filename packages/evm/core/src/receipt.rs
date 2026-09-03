use revm::{
    context::result::{ExecutionResult, Output},
    primitives::{Address, B256, Bytes, Log},
};
use serde::{Deserialize, Serialize};

// Mirror of alloys `Log` so that neither the bincode encoding persisted in the
// commits table nor the JSON crossing the napi boundary depends on an upstream serde impl.
#[derive(Default, Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredLog {
    pub address: Address,
    pub topics: Vec<B256>,
    pub data: Bytes,
}

impl From<Log> for StoredLog {
    fn from(log: Log) -> Self {
        let (topics, data) = log.data.split();
        Self {
            address: log.address,
            topics,
            data,
        }
    }
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TxReceipt {
    pub gas_used: u64,
    pub cumulative_gas_used: u64,
    pub gas_refunded: u64,
    pub success: u8,
    pub contract_address: Option<String>,
    pub logs: Option<Vec<StoredLog>>,
    pub output: Option<Bytes>,
}

pub fn map_execution_result(result: ExecutionResult, cumulative_gas_used: u64) -> TxReceipt {
    match result {
        ExecutionResult::Success {
            gas, output, logs, ..
        } => match output {
            Output::Call(output) => TxReceipt {
                gas_used: gas.tx_gas_used(),
                gas_refunded: gas.inner_refunded(),
                cumulative_gas_used,
                success: 1,
                contract_address: None,
                logs: Some(map_logs(logs)),
                output: Some(output),
            },
            Output::Create(output, address) => TxReceipt {
                gas_used: gas.tx_gas_used(),
                gas_refunded: gas.inner_refunded(),
                cumulative_gas_used,
                success: 1,
                contract_address: address.map(|address| address.to_string()),
                logs: Some(map_logs(logs)),
                output: Some(output),
            },
        },
        ExecutionResult::Revert { gas, output, .. } => TxReceipt {
            gas_used: gas.tx_gas_used(),
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: Some(output),
        },
        ExecutionResult::Halt { gas, .. } => TxReceipt {
            gas_used: gas.tx_gas_used(),
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: None,
        },
    }
}

fn map_logs(logs: Vec<Log>) -> Vec<StoredLog> {
    logs.into_iter().map(Into::into).collect()
}

#[cfg(test)]
mod tests {
    use crate::receipt::{StoredLog, map_execution_result};
    use alloy_primitives::{Log, LogData, address, b256};
    use bytes::Bytes;
    use revm::context::result::{ExecutionResult, HaltReason, Output, ResultGas, SuccessReason};

    fn sample_log() -> Log {
        Log {
            address: address!("00000000000000000000000000000000000000aa"),
            data: LogData::new(
                vec![
                    b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                    b256!("0000000000000000000000000000000000000000000000000000000000000002"),
                ],
                alloy_primitives::Bytes::from_static(&[0xde, 0xad, 0xbe, 0xef]),
            )
            .unwrap(),
        }
    }

    #[test]
    fn stored_log_bincode_matches_alloy_log() {
        let log = sample_log();
        let stored = StoredLog::from(log.clone());

        let alloy_bytes = bincode::serialize(&log).unwrap();
        assert_eq!(bincode::serialize(&stored).unwrap(), alloy_bytes);

        let decoded: StoredLog = bincode::deserialize(&alloy_bytes).unwrap();
        assert_eq!(decoded, stored);
    }

    #[test]
    fn stored_log_json_matches_alloy_log() {
        let log = sample_log();
        let stored = StoredLog::from(log.clone());

        assert_eq!(
            serde_json::to_value(&stored).unwrap(),
            serde_json::to_value(&log).unwrap()
        );
    }

    #[test]
    fn test_map_execution_result_call() {
        let result = ExecutionResult::Success {
            reason: SuccessReason::Stop,
            gas: ResultGas::new_with_state_gas(25000, 2100, 0, 0),
            logs: vec![],
            output: Output::Call(alloy_primitives::Bytes(Bytes::new())),
        };

        let output = map_execution_result(result, 0);

        assert_eq!(output.contract_address, None);
        assert_eq!(output.gas_used, 22900);
        assert_eq!(output.cumulative_gas_used, 0);
        assert_eq!(output.gas_refunded, 2100);
        assert_eq!(output.logs, Some(vec![]));
        assert_eq!(output.output, Some(alloy_primitives::Bytes(Bytes::new())));
        assert_eq!(output.success, 1);
    }

    #[test]
    fn test_map_execution_result_create() {
        let result = ExecutionResult::Success {
            reason: SuccessReason::Stop,
            gas: ResultGas::new_with_state_gas(355_000, 0, 0, 0),
            logs: vec![],
            output: Output::Create(
                alloy_primitives::Bytes(Bytes::new()),
                Some(address!("0000000000000000000000000000000000000001")),
            ),
        };

        let output = map_execution_result(result, 0);

        assert_eq!(
            output.contract_address,
            Some(address!("0000000000000000000000000000000000000001").to_string())
        );
        assert_eq!(output.gas_used, 355_000);
        assert_eq!(output.cumulative_gas_used, 0);
        assert_eq!(output.gas_refunded, 0);
        assert_eq!(output.logs, Some(vec![]));
        assert_eq!(output.output, Some(alloy_primitives::Bytes(Bytes::new())));
        assert_eq!(output.success, 1);
    }

    #[test]
    fn test_map_execution_result_revert() {
        let result = ExecutionResult::Revert {
            gas: ResultGas::new_with_state_gas(30000, 0, 0, 0),
            logs: vec![],
            output: alloy_primitives::Bytes(Bytes::new()),
        };

        let output = map_execution_result(result, 0);

        assert_eq!(output.contract_address, None);
        assert_eq!(output.gas_used, 30000);
        assert_eq!(output.cumulative_gas_used, 0);
        assert_eq!(output.gas_refunded, 0);
        assert_eq!(output.logs, None);
        assert_eq!(output.output, Some(alloy_primitives::Bytes(Bytes::new())));
        assert_eq!(output.success, 0);
    }

    #[test]
    fn test_map_execution_result_halt() {
        let result = ExecutionResult::Halt {
            reason: HaltReason::StackOverflow,
            gas: ResultGas::new_with_state_gas(30000, 0, 0, 0),
            logs: vec![],
        };

        let output = map_execution_result(result, 0);

        assert_eq!(output.contract_address, None);
        assert_eq!(output.gas_used, 30000);
        assert_eq!(output.cumulative_gas_used, 0);
        assert_eq!(output.gas_refunded, 0);
        assert_eq!(output.logs, None);
        assert_eq!(output.output, None);
        assert_eq!(output.success, 0);
    }
}
