require('dotenv').config();

const Web3 = require('web3');
const MongoClient = require('mongodb').MongoClient;
const email = require('emailjs');
const Decimal = require('decimal.js');

const web3 = new Web3('ws://localhost:8546');
const server = email.server.connect({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  ssl: true
});

const generateAccount = (db) => {
  const {address, privateKey} = web3.eth.accounts.create();
  //todo: get rid of dublicates
  db.collection('accounts').insertOne({address, privateKey});
  checkBalance(address, db);
  setTimeout(() => {
    generateAccount(db);
  }, 0);
};

const checkBalance = async (address, db) => {
  const balance = await web3.eth.getBalance(address);
  if (new Decimal(balance).greaterThan(0)) {
    db.collection('accounts').updateOne({address}, {$set: {balance}});
    server.send({
      text: `${address} ${balance}`,
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Reach account found',
    }, console.log);
  }
};

const url = 'mongodb://localhost:27017';
const dbName = 'IKnowYourEthereumPrivateKey';
MongoClient.connect(url, async (err, client) => {
  const db = client.db(dbName);
  subscribe(db);
  generateAccount(db);
});

const subscribe = async (db) => {
  const id = await web3.eth.net.getId();
  let lastBlock = await db.collection('lastBlocks').findOne({id});
  if (!lastBlock) lastBlock = await web3.eth.getBlock('latest');
  let currentBlock = await web3.eth.getBlock('latest');
  while (new Decimal(lastBlock.number).plus(1).lessThanOrEqualTo(currentBlock.number)) {
    handleBlock(db, lastBlock.number, id);
    lastBlock = await web3.eth.getBlock(new Decimal(lastBlock.number).plus(1).toString());
    currentBlock = await web3.eth.getBlock('latest');
  }

  web3.eth.subscribe('newBlockHeaders', async (error, result) => {
    if (error) return console.log(error);
    handleBlock(db, result.number, id);
  });
};

const handleBlock = async (db, number, id) => {
  db.collection('lastBlocks').updateOne({id}, {$set: {number: number}}, {upsert: true});
  const {transactions} = await web3.eth.getBlock(number);
  transactions.forEach(tx => {
    if (tx.to) checkBalance(tx.to, db)
  });
};
