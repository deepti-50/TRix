// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract GameToken is ERC20, Ownable {
    address public minter;
    event MinterChanged(address indexed newMinter);
    event Minted(address indexed to, uint256 amount);
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}
    modifier onlyMinter(){ require(msg.sender==minter, "not minter"); _; }
    function setMinter(address _minter) external onlyOwner { minter=_minter; emit MinterChanged(_minter); }
    function mint(address to, uint256 amount) external onlyMinter { _mint(to, amount); emit Minted(to, amount); }
}