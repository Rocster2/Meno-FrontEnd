// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title HackathonDemoNFT
 * @dev Demo NFT contract for Morph Hackathon demonstration
 */
contract HackathonDemoNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;
    
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event BaseURIUpdated(string newBaseURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Mint NFT with specific metadata URI
     */
    function mintWithURI(address to, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit NFTMinted(to, tokenId, tokenURI);
        return tokenId;
    }    /**
     * @dev Mint NFT to caller (for demo purposes)
     */
    function mintToSelf(string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit NFTMinted(msg.sender, tokenId, tokenURI);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs
     */
    function batchMint(address to, string[] memory tokenURIs) public onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            
            tokenIds[i] = tokenId;
            emit NFTMinted(to, tokenId, tokenURIs[i]);
        }
        
        return tokenIds;
    }

    /**
     * @dev Set base URI for metadata
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @dev Get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override tokenURI to use custom URI if set, otherwise use base URI
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
     * @dev Get next token ID
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}