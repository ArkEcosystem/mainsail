use revm::primitives::alloy_primitives::Bloom;

use crate::db::PendingCommit;

pub fn calculate(pending_commit: &PendingCommit) -> Result<Bloom, crate::db::Error> {
    let results = match pending_commit.built_commit.as_ref() {
        Some(commit) => &commit.results,
        None => &pending_commit.results,
    };

    let receipt_blooms = results
        .values()
        .map(|r| Bloom::from_iter(r.logs()))
        .collect::<Vec<Bloom>>();

    let logs_bloom = receipt_blooms
        .into_iter()
        .fold(Bloom::ZERO, |acc, value| acc | value);

    Ok(logs_bloom)
}

#[test]
fn test_calculate_empty_logs_bloom() {
    let result = calculate(&Default::default()).expect("ok");
    assert_eq!(result, revm::primitives::alloy_primitives::bloom!());
}

#[test]
fn test_calculate_logs_bloom() {
    let _logs =
        |logs: Vec<revm::primitives::B256>| revm::context::result::ExecutionResult::Success {
            logs: logs
                .into_iter()
                .map(|log| {
                    revm::primitives::Log::new_unchecked(
                        revm::primitives::address!("0000000000000000000000000000000000000000"),
                        vec![log],
                        Default::default(),
                    )
                })
                .collect::<Vec<revm::primitives::Log>>(),
            gas_refunded: 0,
            gas_used: 0,
            output: revm::context::result::Output::Call(Default::default()),
            reason: revm::context::result::SuccessReason::Stop,
        };

    struct TestCase {
        pub logs: Vec<revm::primitives::B256>,
        pub bloom: Bloom,
    }

    for test_case in vec![
        TestCase {
            logs: vec![revm::primitives::b256!(
                "02c69be41d0b7e40352fc85be1cd65eb03d40ef8427a0ca4596b1ead9a00e9fc"
            )],
            bloom: revm::primitives::alloy_primitives::bloom!(
                "00000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002020000000000000000000000000000000000000000000000000000001000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
            ),
        },
        TestCase {
            logs: vec![
                revm::primitives::b256!(
                    "aacbdb204397aa18116c7df276b4d889c1232392d9538b0472f7d6e966b93bdd"
                ),
                revm::primitives::b256!(
                    "c98570642b1c831b23513efccbd664243a6affe545e71afc30dc0b46670ecd49"
                ),
                revm::primitives::b256!(
                    "263bc8782e51b510ea0d299830554278f9b864316f5e15280d54a47df679f337"
                ),
                revm::primitives::b256!(
                    "a153068a03c13efdab230c32ca1b60220e723aa98077279e6c6a77df9b167951"
                ),
                revm::primitives::b256!(
                    "ecec3851f00a82cc0ec13e3580c9ce19dbc5d58f45ec6ae252d84d1e341af8cb"
                ),
            ],
            bloom: revm::primitives::alloy_primitives::bloom!(
                "00040000000000000080000000000100000000000000040000000000000000000000000000000000000000000000000200000000000000040000000000000000000000000000000000000000000000000000000000000100000000000000000000000000002000000000000000000000000000000000000000010000000000000000000000000000000000000000000300000000000000000000000000010000000000000400000000000000000000000000000000000000000000000000000000010000000000000000000000000000000800000000000000008000000000000000000000000000000000000000000000000000000000000001000000008000"
            ),
        },
    ] {
        let mut pending = PendingCommit::default();
        pending.results.insert(
            revm::primitives::b256!(
                "0000000000000000000000000000000000000000000000000000000000000001"
            ),
            _logs(test_case.logs),
        );

        let result = calculate(&pending).expect("ok");
        assert_eq!(result, test_case.bloom);
    }
}
