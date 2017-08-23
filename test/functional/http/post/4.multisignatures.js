'use strict';

var node = require('../../../node');
var shared = require('./shared');
var constants = require('../../../../helpers/constants');

var sendTransaction = require('../../../common/complexTransactions').sendTransaction;
var creditAccount = require('../../../common/complexTransactions').creditAccount;
var sendSignature = require('../../../common/complexTransactions').sendSignature;

var creditAccountPromise = node.Promise.promisify(creditAccount);
var sendSignaturePromise = node.Promise.promisify(sendSignature);
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);

function Scenario (size, amount) {
	this.account = node.randomAccount();
	this.members = new Array();
	this.keysgroup = new Array();

	var i, auxAccount;
	for(i = 0; i < size-1; i++) {
	 auxAccount = node.randomAccount();
	 this.members.push(auxAccount);
	 this.keysgroup.push('+' + auxAccount.publicKey);
	}

	this.tx = null;
	this.amount = amount || 100000000000;
}

describe('POST /api/transactions (type 4) register multisignature', function () {

	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];
	var pendingMultisignatures = [];

	var scenarios = {
		'no_funds': 								new Scenario(3, 0),
		'scarce_funds': 						new Scenario(3, constants.fees.multisignature * 2),
		'minimum_not_reached':			new Scenario(4), //4_2
		'regular':									new Scenario(3), //3_2
		'max_signatures': 					new Scenario(16), //16_2
		'max_signatures_max_min': 	new Scenario(16), //16_16
		'more_than_max_signatures': new Scenario(18), //18_2
	};

	var account = node.randomAccount();
	var transaction, signature;

	before(function () {
		//Crediting accounts
		return node.Promise.all(Object.keys(scenarios).map(function (key) {
			return creditAccountPromise(scenarios[key].account.address, scenarios[key].amount).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
			});
		})).then(function (res) {
			return onNewBlockPromise();
		});
	});

	// describe('schema validations', function () {
	//
	// 	shared.invalidAssets(account, 'multisignature', badTransactions);
	//
	// 	it('using empty keysgroup should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, [], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid multisignature keysgroup. Must not be empty');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using sender in the keysgroup should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey, '+' + account.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid multisignature keysgroup. Can not contain sender');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using no math operator in keysgroup should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, [node.eAccount.publicKey, accountNoFunds.publicKey, accountScarceFunds.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using invalid math operator in keysgroup should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['-' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey, '+' + accountScarceFunds.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	// TODO: bug in 1.0.0
	// 	it.skip('using empty member in keysgroup should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey, '+' + accountScarceFunds.publicKey, null], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	// TODO: change sentence 'Must be less than or equal to keysgroup size + 1'
	// 	it('using min bigger than keysgroup size plus 1 should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, [node.eAccount.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid multisignature min. Must be less than keysgroup size');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using min more than maximum(15) should fail', function (done) {
	//
	// 		transaction = node.lisk.multisignature.createMultisignature(max_signatures_max_min.account.password, null, max_signatures_max_min.keysgroup, 1, 16);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value 16 is greater than maximum 15');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	// TODO: Error message change : Must be between 2 and 16
	// 	it('using min less than minimum(2) should fail', function (done) {
	// 		var keysgroup = [];
	// 		var auxAccount;
	// 		for(var i = 0; i < 15; i++) {
	// 		 auxAccount = node.randomAccount();
	// 		 keysgroup.push('+' + auxAccount.publicKey);
	// 		}
	// 		console.log(keysgroup.length);
	// 		transaction = node.lisk.multisignature.createMultisignature(max_signatures_max_min.account.password, null, keysgroup, 1, 1);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid multisignature min. Must be between 1 and 16');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	// });
	//
	// describe('transactions processing', function () {
	//
	// 	it('with no funds should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(accountNoFunds.password, null, ['+' + node.eAccount.publicKey, '+' + account.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.not.be.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
	// 			badTransactions.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('with scarce funds should be ok', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(accountScarceFunds.password, null, ['+' + node.eAccount.publicKey, '+' + account.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.ok;
	// 			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
	// 			pendingMultisignatures.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using valid params (3,2) should be ok', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.ok;
	// 			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
	// 			pendingMultisignatures.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using valid params (4,2) should be ok', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(account4_2.password, null, ['+' + node.eAccount.publicKey, '+' + account.publicKey, '+' + accountNoFunds.publicKey], 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.ok;
	// 			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
	// 			pendingMultisignatures.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using valid params (16,16) should be ok', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(max_signatures.account.password, null, max_signatures.keysgroup, 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.ok;
	// 			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
	// 			pendingMultisignatures.push(transaction);
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	it('using more members than maximum (17,2) should fail', function (done) {
	// 		transaction = node.lisk.multisignature.createMultisignature(scenarios.more_than_max_signatures.account.password, null, scenarios.more_than_max_signatures.keysgroup, 1, 2);
	//
	// 		sendTransaction(transaction, function (err, res) {
	// 			node.expect(res).to.have.property('success').to.be.not.ok;
	// 			node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too long (17), maximum 16');
	// 			scenarios.more_than_max_signatures.tx = transaction;
	// 			done();
	// 		}, true);
	// 	});
	//
	// 	describe('signing transactions', function () {
	//
	// 		it('with not all the signatures should be ok but never confirmed', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], account2.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[0]).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.ok;
	// 			});
	// 		});
	//
	// 		it('twice with the same account should fail', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], account.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[0]).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.not.ok;
	// 				node.expect(res).to.have.property('message').to.equal('Error processing signature: Failed to verify signature');
	// 			});
	// 		});
	//
	// 		it('with not requested account should fail', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], accountNoFunds.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[0]).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.not.ok;
	// 				node.expect(res).to.have.property('message').to.equal('Error processing signature: Failed to verify signature');
	// 			});
	// 		});
	//
	// 		it('with all the signatures should be ok and confirmed (even with accounts without funds)', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[1], account2.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[1]).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.ok;
	//
	// 				signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[1], accountNoFunds.password);
	//
	// 				return sendSignaturePromise(signature, pendingMultisignatures[1]).then(function (res) {
	// 					node.expect(res).to.have.property('success').to.be.ok;
	//
	// 					goodTransactions.push(pendingMultisignatures[1]);
	// 				});
	// 			});
	// 		});
	//
	// 		it('with all the signatures already in place should fail', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[1], account.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[1]).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.not.ok;
	// 				node.expect(res).to.have.property('message').to.equal('Error processing signature: Failed to verify signature');
	// 				pendingMultisignatures.pop();
	// 			});
	// 		});
	//
	// 		it('with 4 signs 2 min not working)', function () {
	// 			signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], account.password);
	//
	// 			return sendSignaturePromise(signature, pendingMultisignatures[0])
	// 				.then(function (res) {
	// 					node.expect(res).to.have.property('success').to.be.ok;
	// 					signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], accountNoFunds.password);
	// 					return sendSignaturePromise(signature, pendingMultisignatures[0]);
	// 				})
	// 				.then(function (res) {
	// 					node.expect(res).to.have.property('success').to.be.ok;
	// 					signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], accountScarceFunds.password);
	// 					return sendSignaturePromise(signature, pendingMultisignatures[0]);
	// 				})
	// 				.then(function (res) {
	// 					node.expect(res).to.have.property('success').to.be.ok;
	// 					goodTransactions.push(pendingMultisignatures[0]);
	// 					pendingMultisignatures.pop();
	// 				});
	// 		});
	// 	});
	//
	// 	it.skip('with 20 signs 2 min BUGG', function () {
	// 		return node.Promise.all(node.Promise.map(scenarios.more_than_max_signatures.members, function (member) {
	// 			signature = node.lisk.multisignature.signTransaction(scenarios.more_than_max_signatures.tx, member.password);
	//
	// 			return sendSignaturePromise(signature, scenarios.more_than_max_signatures.tx).then(function (res) {
	// 				node.expect(res).to.have.property('success').to.be.ok;
	// 			});
	// 		})).then(function (res) {
	// 			goodTransactions.push(scenarios.more_than_max_signatures.tx);
	// 		});
	// 	});
	// });
	//
	// describe('transactions confirmation', function () {
	//
	// 	shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	// });

	// describe('enforcement', function () {
	//
	// 	describe('type 4 - registering multisignature account', function () {
	// 	});
	//
	// });
	//
	// describe('enforcement confirmation', function () {
	//
	// 	shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement, pendingMultisignatures);
	// });
});
