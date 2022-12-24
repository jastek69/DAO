//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol"; //Token imported

contract DAO {
    address owner;
    Token public token; // Save Token as a State var so it can be accessed in functions
    uint public quorum;

    struct Proposal {  // Struct data type for Proposal
        uint256 id; // id number of proposal
        string name; // Description of proposal
        uint256 amount; // amount of money being sent
        address payable recipient; // who is being sent the money - need to know they can receive ether
        uint256 votes; // number of votes for Proposal
        bool finalized; // did proposal pass or fail
    }

    uint256 public proposalCount; // keep track of the proposal count
    
     // store a particular Proposal into a mapping with a key value pair relationship: 
    mapping(uint256 => Proposal) public proposals; // key (uint256) is the ID (the proposal) and value is the struct
                                                    

    // Keep track of votes of investor
    mapping(address => mapping(uint256 => bool)) votes; // Create a mapping of mappings

    event Propose(uint id, uint256 amount, address recipient, address creator); // Proposal Event

    event Vote(uint256 id, address investor);        // Voting Event
    event Finalize(uint256 id);     // Finalize event

    constructor(Token _token, uint256 _quorum) {  // Add Token to constructor function
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }
   
   // Allow contract to receive ether -  Receive and hold funds - funds our treasury
   receive() external payable {}  // external means can be called outside the smart contract and not inside

    // Modifier for only investor
    modifier onlyInvestor() {
        require(
            token.balanceOf(msg.sender) > 0, "must be token holder");
            _; // means excute the body of the function which is onlyInvestor
    }

   // Proposals
   function createProposal(         // Create proposal
        string memory _name, 
        uint256 _amount,    
        address payable _recipient 
    ) external  onlyInvestor {      // modifier function called
        // Require function to check for balance is at least amount of the contract being created
        require(address(this).balance >= _amount); // address().balance gets Ether balance

        // Check they  actually have a Token in the DAO
        require(Token(token).balanceOf(msg.sender) > 0, "Must be Token holder"); // Check they have tokens

        
        proposalCount++;

        // Create a proposal - with a struct data type       
        proposals[proposalCount] = Proposal(proposalCount, _name, _amount, _recipient, 0, false);  // adding to mapping

        emit Propose(proposalCount, _amount, _recipient, msg.sender);
   }

   //Voting - only voting in favor of


// Vote on Proposal
function vote(uint256 _id) external onlyInvestor {
    // Fetch proposal from mapping by id
    Proposal storage proposal = proposals[_id];   // tell Solidity that you are reading the proposal out of storage and assigning it to the var porposal

    // Update votes
    // Token Weighted Voting = Weighted by amount of tokens held
    // Whatever amt of Tokens a member has is the number of votes they get
    proposal.votes += proposal.votes + token.balanceOf(msg.sender); // adding vote saves back to mapping


    // Don't let investors vote twice
    require(!votes[msg.sender][_id], "already voted");  // ! does the opposite so sets to false as in investor has not voted yet. once vote it's set to True
    
    // Track that user has voted and only once
    votes[msg.sender][_id] = true;

    // Emit Vote event
    emit Vote(_id, msg.sender);
   }

// Finalize Proposal & transfer funds
function finalizeProposal(uint256 _id) external onlyInvestor {

    // Fetch Proposal
     Proposal storage proposal = proposals[_id];

    // Ensure proposal is not already finalized
    require(proposal.finalized == false, "Proposal already finalized");
    
    // Mark proposal as Finalized
    proposal.finalized = true;


    // Check that proposal has enough votes
    require(proposal.votes >= quorum, "Must reach quorum to finalize proposal");

    // Check that the contract has enough Ether
    require(address(this).balance >= proposal.amount);

    // Transfer funds
    (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");  // This way can get the return values - meta data
    require(sent);


    // Emit event
    emit Finalize(_id);
    }
}
