// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

error RecipientsAndAmountsMismatch();
error InvalidValue();
error FailedToSendEther();

contract MultiPayment {
    function pay(address payable[] calldata recipients, uint256[] calldata amounts) public payable {
        if (recipients.length != amounts.length) {
            revert RecipientsAndAmountsMismatch();
        }

        uint256 total = 0;

        // Calculate the total amount to send
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        // Ensure the sender has sent enough Ether
        if (msg.value != total) {
            revert InvalidValue();
        }

        // Transfer Ether to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            // Transfer the specified amount to each recipient
            (bool sent,) = recipients[i].call{value: amounts[i]}("");
            if (!sent) {
                revert FailedToSendEther();
            }
        }
    }
}
