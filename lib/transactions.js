var bitcoin = require('bitcoinjs-lib');
var util = require('./util.js');
const crypto = require("crypto");
const endianness = require('endianness');

// public members
var txHash;

exports.txHash = function(){
  return txHash;
};

function scriptCompile(addrHash){
    script = bitcoin.script.compile(
        [
            bitcoin.opcodes.OP_DUP,
            bitcoin.opcodes.OP_HASH160,
            addrHash,
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_CHECKSIG
        ]);
    return script;
}

function scriptFoundersCompile(address){
    script = bitcoin.script.compile(
        [
            bitcoin.opcodes.OP_HASH160,
            address,
            bitcoin.opcodes.OP_EQUAL
        ]);
    return script;
}

function getTxHash(txHex){
    //calculate the tx hash
    let buf = Buffer.from(txHex,'hex')
    const sha256Hasher = crypto.createHash('sha256');
    sha256Hasher.write(buf);
    const sha256Hasher2 = crypto.createHash('sha256');
    sha256Hasher2.write(sha256Hasher.digest());
    let txbuff = sha256Hasher2.digest();
//    console.log("txbuff: " , typeof txbuff);
    var len = txbuff.length
//    let txBuff = endianness(new Uint8Array(txbuff), 32)
//    console.log("tcBuff: ", typeof txBuff);
    return txbuff
}

exports.createGeneration = function(rpcData, blockReward, feeReward, recipients, poolAddress){
    var _this = this;
    var blockPollingIntervalId;

    var emitLog = function (text) {
        _this.emit('log', 'debug', text);
    };
    var emitWarningLog = function (text) {
        _this.emit('log', 'warning', text);
    };
    var emitErrorLog = function (text) {
        _this.emit('log', 'error', text);
    };
    var emitSpecialLog = function (text) {
        _this.emit('log', 'special', text);
    };

    var poolAddrHash = bitcoin.address.fromBase58Check(poolAddress).hash;



    var tx = new bitcoin.Transaction();

    //set tx version
    tx.version = 0x050003;

    var blockHeight = rpcData.height;
    // input for coinbase tx
    if (blockHeight.toString(16).length % 2 === 0) {
        var blockHeightSerial = blockHeight.toString(16);
    } else {
        var blockHeightSerial = '0' + blockHeight.toString(16);
    }
    var height = Math.ceil((blockHeight << 1).toString(2).length / 8);
    var lengthDiff = blockHeightSerial.length/2 - height;
    for (var i = 0; i < lengthDiff; i++) {
        blockHeightSerial = blockHeightSerial + '00';
    }
    length = '0' + height;
    var serializedBlockHeight = new Buffer.concat([
        new Buffer(length, 'hex'),
        util.reverseBuffer(new Buffer(blockHeightSerial, 'hex')),
        new Buffer('00', 'hex') // OP_0
    ]);

    tx.addInput(new Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
        0xFFFFFFFF,
        0xFFFFFFFF,
        new Buffer.concat([serializedBlockHeight,
            Buffer('6b6177706f77', 'hex')])
    );
    minerreward = blockReward;
    if (rpcData.founder.payee !== undefined) {
        tx.addOutput( 
            scriptCompile(bitcoin.address.fromBase58Check(rpcData.founder.payee).hash),
            Math.floor(rpcData.founder.amount)
            
        );
        minerreward -= rpcData.founder.amount;
    }
    // Handle Smartnodes
    if (rpcData.smartnode) {
        if (rpcData.smartnode.length > 0) {
            for ( x in rpcData.smartnode) {
                payee = rpcData.smartnode[x]
                reward =  payee.amount;
                tx.addOutput(
                    scriptCompile(bitcoin.address.fromBase58Check(payee.payee).hash),
                    reward
                );
                minerreward -= reward;
            }
        }
    }

    for (var i = 0; i < recipients.length; i++) {
        reward = Math.round((blockReward) * (recipients[i].percent / 100))
        tx.addOutput(
           scriptCompile(bitcoin.address.fromBase58Check(recipients[i].address).hash),
           reward
        );
        minerreward -= reward;
    }

    tx.addOutput(
        scriptCompile(poolAddrHash),
        minerreward
    );

//    if (rpcData.default_witness_commitment !== undefined) {
//        tx.addOutput(new Buffer(rpcData.default_witness_commitment, 'hex'), 0);
//    }

    txHex = tx.toHex();
    if (rpcData.coinbase_payload.length > 0) {
        txHex += '46'+rpcData.coinbase_payload;
    }

    txHash = getTxHash(txHex).toString("hex")
    return txHex;
};

module.exports.getFees = function(feeArray){
    var fee = Number();
    feeArray.fotxHash = Buffer.alloc(32, 0);
    return fee;
};
