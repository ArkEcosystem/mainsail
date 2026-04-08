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
            gas, output, logs, ..
        } => match output {
            Output::Call(output) => TxReceipt {
                gas_used: gas.used(),
                gas_refunded: gas.inner_refunded(),
                cumulative_gas_used,
                success: 1,
                contract_address: None,
                logs: Some(logs),
                output: Some(output),
            },
            Output::Create(output, address) => TxReceipt {
                gas_used: gas.used(),
                gas_refunded: gas.inner_refunded(),
                cumulative_gas_used,
                success: 1,
                contract_address: address.map(|address| address.to_string()),
                logs: Some(logs),
                output: Some(output),
            },
        },
        ExecutionResult::Revert { gas, output, .. } => TxReceipt {
            gas_used: gas.used(),
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: Some(output),
        },
        ExecutionResult::Halt { gas, .. } => TxReceipt {
            gas_used: gas.used(),
            success: 0,
            cumulative_gas_used,
            gas_refunded: 0,
            contract_address: None,
            logs: None,
            output: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use crate::receipt::map_execution_result;
    use alloy_primitives::address;
    use bytes::Bytes;
    use revm::context::result::{ExecutionResult, HaltReason, Output, ResultGas, SuccessReason};

    #[test]
    fn test_map_execution_result_call() {
        let result = ExecutionResult::Success {
            reason: SuccessReason::Stop,
            gas: ResultGas::new(30000, 25000, 2100, 0, 0),
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
            gas: ResultGas::new(1_000_000, 355_000, 0, 0, 0),
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
            gas: ResultGas::new(30000, 30000, 0, 0, 0),
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
            gas: ResultGas::new(30000, 30000, 0, 0, 0),
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
