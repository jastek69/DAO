const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether') // converts 1000 to Ether = 1000000000000000000000000
}

describe('Token', ()=> {        // tests go inside here ... see https://hardhat.org/tutorial/testing-contracts
    let token, accounts, deployer, receiver, exchange
    
    beforeEach(async() => {
        // Fetch Token from Blockchain
        const Token = await ethers.getContractFactory('Token') // gets the actual Contract
        token = await Token.deploy('Sobek', 'SOB', '1000000')    // get Deployed instance of that contract
        
        // Get accounts in the test suite
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        receiver = accounts[1]
        exchange = accounts[2]        
    })

    describe('Deployment', () => {
        const name = 'Sobek'
        const symbol = 'SOB'
        const decimals = '18'
        const totalSupply = tokens('1000000')

        it('Has correct name', async () => {    // Read Token name. Check that name is correct ... see Chai matchers: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html 
            expect(await token.name()).to.equal(name)
        })
    
        it('Has correct symbol', async () => {  // Read Token symbol. Check that symbol is correct 
            expect(await token.symbol()).to.equal(symbol)
        })
    
        it('Has correct decimals', async () => {  // Read Token decimals 
            expect(await token.decimals()).to.equal(decimals)
        })
    
        it('Has correct total supply', async () => {  // Read Token total supply - converts 1000000 to Ether = 1000000000000000000000000
            expect(await token.totalSupply()).to.equal(totalSupply)
        })

        it('Assigns total supply to deployer', async () => {
            expect(await token.balanceOf(deployer.address)).to.equal(totalSupply)    
        })
    })    

    describe('Sending Tokens', () => {
        let amount, transaction, result

        describe ('Success', () => {     // Success

            beforeEach(async () => {        // Transfer tokens
                amount = tokens(100)  
                transaction = await token.connect(deployer).transfer(receiver.address, amount) // need to connect wallet in order to pay a fee as doing an action - sending tokens
                result = await transaction.wait()
            })    
            
            it('Transfers token balances', async () => {
                // Ensure that tokens were transferred (balance changes)
                expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
                expect(await token.balanceOf(receiver.address)).to.equal(amount)
            })
    
            it('Emits a Transfer event', async () => { // Transfer Event test
                //Checking Events
                const event = result.events[0]
                console.log(event)
                expect(event.event).to.equal('Transfer')
                
                //Checking Arguments 
                const args = event.args
                expect(args.from).to.equal(deployer.address)
                expect(args.to).to.equal(receiver.address)
                expect(args.value).to.equal(amount)
            })

        })

            describe('Failure', () => {
                it('Rejects insufficient balances', async () => {
                    // Transfer more tokens than deployer has - 10M
                    const invalidAmount = tokens(10000000)
                    await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted
                })

                it('Rejects invalid recipient', async () => {
                    const amount = tokens(100)
                    await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
                })

            })
              
    })

    describe('Approving Tokens', () => {
        let amount, transaction, result

        beforeEach(async () => {
            amount = tokens(100)
            transaction = await token.connect(deployer).approve(exchange.address, amount)
            result = await transaction.wait()
        })

        describe('Success', () => {
            it('Allocates an allowance for delegated token spending', async() => {
                expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount)
            })

            it('Emits a Approval event', async () => { // Approval Event test
                //Checking Events
                const event = result.events[0]
                expect(event.event).to.equal('Approval')
                
                //Checking Arguments 
                const args = event.args
                expect(args.owner).to.equal(deployer.address)
                expect(args.spender).to.equal(exchange.address)
                expect(args.value).to.equal(amount)
            })

        })

        describe('Failure', () => {
            it('Rejects invalid spenders', async () => {
                await expect(token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
            })
        })

    })

    describe('Delegated Token Transfers', () => {
        let amount, transaction, result

        beforeEach(async () => {
            amount = tokens(100)
            transaction = await token.connect(deployer).approve(exchange.address, amount)
            result = await transaction.wait()
        })

        describe('Success', () => {
            beforeEach(async () => {
                amount = tokens(100)
                transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount)
                result = await transaction.wait()
            })

            it('Transfers token balances', async () => {
                expect(await token.balanceOf(deployer.address)).to.be.equal(ethers.utils.parseUnits("999900", "ether"))
                expect(await token.balanceOf(receiver.address)).to.be.equal(amount)
            })

            it('Resets the allowance', async () => {
                expect(await token.allowance(deployer.address, exchange.address)).to.be.equal(0)
             })


            it('Emits a Transfer event', async () => { // Approval Event test
                //Checking Events
                const event = result.events[0]
                expect(event.event).to.equal('Transfer')
                
                //Checking Arguments 
                const args = event.args
                expect(args.from).to.equal(deployer.address)
                expect(args.to).to.equal(receiver.address)
                expect(args.value).to.equal(amount)
            })
        })
        
        describe("Failure", () => {         // Attempt tp transfer too many tokens
            it('Rejects insufficient amounts', async () => {
                const invalidAmount = tokens(100000000)
                await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted
            })
        })    

        })

    })
