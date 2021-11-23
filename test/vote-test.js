const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("vote contract test", () => {
    let vote, owner, account1, account2, account3;

    before(async () => {
        [owner, account1, account2, account3] = await ethers.getSigners();

        const Vote = await ethers.getContractFactory("Vote");
        vote = await Vote.deploy();
        await vote.deployed();
        console.log("Vote contract address is: " + vote.address);
    });

    // everyone can create proposal
    it("create proposal", async() => {
        // account 1 can create proposal
        await vote.connect(account1).createProposal(ethers.utils.formatBytes32String("Proposal 1"));

        // account 2 can create proposal
        await vote.connect(account2).createProposal(ethers.utils.formatBytes32String("Proposal 2"));

        const proposals = await vote.proposals(1);
        expect(
            ethers.utils.parseBytes32String(proposals[0])
        ).to.equal("Proposal 2");
    });

    it("voting", async() => {
        // error invalid proposal id
        await expect(
            vote.connect(account3).vote(10, account3.address)
        ).to.be.revertedWith("Invalid porposal");
        
        // error as not authorized to vote
        await expect(
            vote.connect(account3).vote(0, account3.address)
        ).to.be.revertedWith("Not authorized to vote");

        // register authority and vote
        await vote.connect(owner).addAuthor(account3.address);
        await vote.connect(account3).vote(0, account3.address);
        
        // vote once per proposal
        await expect(
            vote.connect(account3).vote(0, account3.address)
        ).to.be.revertedWith("Voted already!");

        // vote as other address
        await vote.connect(owner).addAuthor(account2.address);
        await vote.connect(account2).vote(0, account2.address);

        // vote once per proposal
        await expect(
            vote.connect(account2).vote(0, account2.address)
        ).to.be.revertedWith("Voted already!");
    });

    it("test delegate", async() => {
        // error as not delegated
        await expect(
            vote.connect(account3).vote(1, account1.address)
        ).to.be.revertedWith("You dont have delegation");

        // account1 can not vote as not authorized
        await expect(
            vote.connect(account1).vote(1, account1.address)
        ).to.be.revertedWith("Not authorized to vote");

        // account1 delegates vote to account2
        await vote.connect(account1).delegate(account2.address);
        
        // cancel delegate from account2
        await vote.connect(account1).cancelDelegate(account2.address);

        // error when cancel not delegated acctoun
        await expect(
            vote.connect(account1).cancelDelegate(account3.address)
        ).to.be.revertedWith("He is not delegated user");
        
        // account1 delegates vote to account3 and account3
        await vote.connect(account1).delegate(account3.address);
        
        // account2 can not vote as delegation removed
        await expect(
            vote.connect(account2).vote(1, account1.address)
        ).to.be.revertedWith("You dont have delegation");

        // delegate vote from account3
        await vote.connect(account3).vote(1, account1.address);

        // give authority to account1
        await vote.connect(owner).addAuthor(account1.address);

        // account1 can not vote as account3 did it as delegation
        await expect(
            vote.connect(account1).vote(1, account1.address)
        ).to.be.revertedWith("Voted already!");

        // account1 can vote for the first proposal
        await vote.connect(account1).vote(0, account1.address);
    });
});