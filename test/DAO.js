const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('DAO', () => {
    let token, dao
    let deployer,
        funder,
        investor1,
        investor2,
        investor3,
        investor4,
        investor5,
        recipient,
        user 

    
  
    beforeEach(async () => {
        // Set up accounts
        let accounts = await ethers.getSigners()
        deployer = accounts[0] // deployer is first account on list
        funder = accounts[1]   // funder is 2nd account on list - sender to DAO treasury
        investor1 = accounts[2]
        investor2 = accounts[3]
        investor3 = accounts[4]
        investor4 = accounts[5]
        investor5 = accounts[6]
        recipient = accounts[7]
        user = accounts[8] // non DAO member - non token holder

        //Deploy Token
        const Token = await ethers.getContractFactory('Token')
        token = await Token.deploy('Sobek', 'SOB', '1000000')
  
        // Send tokens to investors - each one gets 20%
        transaction = await token.connect(deployer).transfer(investor1.address, tokens(200000))
        await transaction.wait()

        transaction = await token.connect(deployer).transfer(investor2.address, tokens(200000))
        await transaction.wait()

        transaction = await token.connect(deployer).transfer(investor3.address, tokens(200000))
        await transaction.wait()

        transaction = await token.connect(deployer).transfer(investor4.address, tokens(200000))
        await transaction.wait()

        transaction = await token.connect(deployer).transfer(investor5.address, tokens(200000))
        await transaction.wait()


        // Deploy DAO
        // Set Quorum to > 50% of token total supply. 
        // 500K tokens + 1 wei, i.e., 500000000000000000000001
        const DAO = await ethers.getContractFactory('DAO')
        dao = await DAO.deploy(token.address, '500000000000000000000001')

        // Funder sends 100 Ether to DAO treasury for Governance
        await funder.sendTransaction({ to: dao.address, value: ether(100) })
    })
  
    describe('Deployment', () => {
        it('Sends ether to the DAO treasury', async() => {
            expect(await ethers.provider.getBalance(dao.address)).to.equal(ether(100))
        })         
  
        it('returns token address', async () => {
        expect(await dao.token()).to.equal(token.address)
        })
  
        it('returns quorum', async () => {
        expect(await dao.quorum()).to.equal('500000000000000000000001')
        })  
  
    }) // end Deployment

    describe('Proposal Creation', () => {
        let transaction, result

        describe('Success', () => {
            
            beforeEach(async () => {
                transaction = await dao.connect(investor1).createProposal('Proposal 1', ether(100), recipient.address)
                result = await transaction.wait()
            })

            it('Updates proposal count', async () => {
                expect(await dao.proposalCount()).to.equal(1)
            })

            it('Updates proposal mapping', async () => {
                const proposal = await dao.proposals(1) // See Struct - accessing mapping by passing in 1 to the function and it will return the proposal struct. Returns values of the Struct inside the array
                console.log(proposal)

                expect(proposal.id).to.equal(1)
                expect(proposal.amount).to.equal(ether(100))
                expect(proposal.recipient).to.equal(recipient.address)
            })

            it('Emits a propose event', async () => {
                await expect(transaction).to.emit(dao, 'Propose')
                    .withArgs(1, ether(100), recipient.address,investor1.address)
            })
        })

        describe('Failure', () => {
            it('Rejects invalid amount', async () => {
                await expect(dao.connect(investor1).createProposal('Proposal 1', ether(1000), recipient.address)).to.be.reverted
    
            })
    
            it('Rejects non-investor', async () => {
                await expect(dao.connect(user).createProposal('Proposal 1', ether(1000), recipient.address)).to.be.reverted
            })
        })
    })   // end Proposal Creation   

    describe('Voting', () => {  
        let transaction, result

        beforeEach(async () => {
            transaction = await dao.connect(investor1).createProposal('Proposal 1', ether(100), recipient.address)
            result = await transaction.wait()
        })

        describe('Success', () => {

            beforeEach(async () => {
                transaction = await dao.connect(investor1).vote(1)
                result = await transaction.wait()
            })            

            it('Updates vote count', async () => {
                const proposal = await dao.proposals(1)
                expect(proposal.votes).to.equal(tokens(200000))
            })

            it('Emits a vote event', async () => {
                await expect(transaction).to.emit(dao, "Vote")
                .withArgs(1, investor1.address)
            })
        })        

        describe('Failure', () => {
                
            it('Rejects non-investor', async () => {    // Test to make sure only investors can vote
                await expect(dao.connect(user).vote(1)).to.be.reverted
            })

            it('Rejects double voting', async () => { // Test for double voting
                transaction = await dao.connect(investor1).vote(1)
                await transaction.wait()

                await expect(dao.connect(investor1).vote(1)).to.be.reverted
            })                  
        })  
    }) // end Describe Voting


    describe('Governance', () => {  
        let transaction, result

        describe('Success', () => {

            beforeEach(async () => {
                // Create proposal
                transaction = await dao.connect(investor1).createProposal('Proposal 1', ether(100), recipient.address)
                result = await transaction.wait()

                // Vote - Send to voting passing status - 3 investors vote yes
                transaction = await dao.connect(investor1).vote(1)
                result = await transaction.wait()

                transaction = await dao.connect(investor2).vote(1)
                result = await transaction.wait()

                transaction = await dao.connect(investor3).vote(1)
                result = await transaction.wait()


                // Finalize proposal
                transaction = await dao.connect(investor3).finalizeProposal(1)
                result = await transaction.wait()
            })

            it('Transfers funds to recipient', async () => {
                expect(await ethers.provider.getBalance(recipient.address)).to.equal(tokens(10100))
            })
            
            it('It updates the proposal to Finalized', async () => {
                const proposal = await dao.proposals(1)
                expect(proposal.finalized).to.equal(true)
            })

            it('Emits a Finalize event', async () => {
                await expect(transaction).to.emit(dao, "Finalize").withArgs(1)
            })
            
        })        

        describe('Failure', () => {

            beforeEach(async () => {
                // Create proposal
                transaction = await dao.connect(investor1).createProposal('Proposal 1', ether(100), recipient.address)
                result = await transaction.wait()

                // Vote - Send to voting passing status - 3 investors vote yes
                transaction = await dao.connect(investor1).vote(1)
                result = await transaction.wait()

                transaction = await dao.connect(investor2).vote(1)
                result = await transaction.wait()                
            })
                           
            // *** AssertionError: Expected transaction to be reverted ***
            it('Rejects finalization if not enough votes', async () => {
                await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted
            })

            it('Rejects finalization from a non-investor', async () => {
                // Vote 3
                transaction = await dao.connect(investor3).vote(1)
                result = await transaction.wait()

                await expect(dao.connect(user).finalizeProposal(1)).to.be.reverted
            })
            
            
            it('Rejects proposal if already finalized', async () => {
                // Vote 3
                transaction = await dao.connect(investor3).vote(1)
                result = await transaction.wait()

                // Finalize
                transaction = await dao.connect(investor1).finalizeProposal(1)
                result = await transaction.wait()

                // Try to finalize again
                await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted
            })

        })  
    }) // end Describe Governance
})

  