// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

contract MultiPayment {
    function pay(address payable[] calldata recipients, uint256[] calldata amounts) public payable {
        require(recipients.length == amounts.length, "Mismatched recipients and amounts");

        uint256 total = 0;

        // Calculate the total amount to send
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        // Ensure the sender has sent enough Ether
        require(msg.value == total, "Insufficient Ether provided");

        // Transfer Ether to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");

            // Transfer the specified amount to each recipient
            (bool sent,) = recipients[i].call{value: amounts[i]}("");
            require(sent, "Failed to send Ether");
        }
    }
}
