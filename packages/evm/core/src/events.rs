use alloy_sol_types::sol;

sol! {
    event Voted(address voter, address validator);
    event Unvoted(address voter, address validator);
}
