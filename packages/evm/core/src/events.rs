use alloy_sol_types::sol;

sol! {
    event Voted(address voter, address validator);
    event Unvoted(address voter, address validator);

    event UsernameRegistered(address addr, string username, string previousUsername);
    event UsernameResigned(address addr, string username);
}
