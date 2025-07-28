// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC721
 * @dev Simple NFT contract for testing purposes
 */
contract MockERC721 is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Mint NFT to any address (for testing)
     */
    function mint(address to, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs
     */
    function batchMint(address to, uint256 quantity) public returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            
            // Set a default metadata URI
            string memory defaultURI = string(abi.encodePacked(
                "https://api.example.com/metadata/",
                Strings.toString(tokenId)
            ));
            _setTokenURI(tokenId, defaultURI);
            
            tokenIds[i] = tokenId;
        }
        
        return tokenIds;
    }

    /**
     * @dev Set base URI for metadata
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Override required by Solidity
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override required by Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Get next token ID
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}