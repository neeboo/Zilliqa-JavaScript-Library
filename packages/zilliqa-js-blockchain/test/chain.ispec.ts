import { Account, Transaction, Wallet } from '@zilliqa-js/account';
import { HTTPProvider, RPCResponse } from '@zilliqa-js/core';
import { BN, Long } from '@zilliqa-js/util';

import { Blockchain } from '../src/chain';
import { TxBlockObj, BlockList } from '../src/types';
import schemas from './schema.json';

jest.setTimeout(90000);

const accounts = [new Account(process.env.GENESIS_PRIV_KEY as string)];
const provider = new HTTPProvider(process.env.HTTP_PROVIDER as string);
const bc = new Blockchain(provider, new Wallet(provider, accounts));

describe('[Integration]: Blockchain', () => {
  it('should be able to get blockchain info', async () => {
    const response = await bc.getBlockChainInfo();
    expect(response.result).toMatchSchema(schemas.definitions.BlockchainInfo);
  });

  it('should be able to get a given DS block', async () => {
    const response = await bc.getDSBlock(1);
    expect(response.result).toMatchSchema(schemas.definitions.DsBlockObj);
  });

  it('should be able to get the latest DS block', async () => {
    const response = await bc.getLatestDSBlock();
    expect(response.result).toMatchSchema(schemas.definitions.DsBlockObj);
  });

  it('should be able to get the total number of DS blocks', async () => {
    const response = await bc.getNumDSBlocks();
    expect(typeof response.result).toBe('string');
  });

  it('should be able to get a list of DS blocks', async () => {
    const { result } = await bc.getNumDSBlocks();
    const numDSBlocks = parseInt(<string>result, 10);

    if (numDSBlocks > 10) {
      const numPages =
        numDSBlocks % 10 === 0
          ? numDSBlocks / 10
          : (numDSBlocks - (numDSBlocks % 10)) / 10 + 1;
      const pages: Array<Promise<RPCResponse<BlockList, string>>> = [];

      for (let i = 1; i <= numPages; i++) {
        pages.push(bc.getDSBlockListing(i));
      }

      const resolved = await Promise.all(pages);
      const receivedNumTxBlocks = resolved.reduce((n, list) => {
        return n + (<BlockList>list.result).data.length;
      }, 0);

      expect(resolved.length).toEqual(numPages);
      expect(receivedNumTxBlocks).toEqual(numDSBlocks);
    } else {
      const response = await bc.getDSBlockListing(1);
      expect((<BlockList>response.result).data.length).toEqual(numDSBlocks);
    }
  });

  it('should be able to get a Tx block', async () => {
    const { result } = await bc.getNumTxBlocks();
    const blockNum = Math.floor(parseInt(<string>result, 10) / 2);
    const response = await bc.getTxBlock(blockNum);

    expect(response.result).toMatchSchema(schemas.definitions.TxBlockObj);
  });

  it('should be able to get the latest Tx block', async () => {
    const { result } = await bc.getNumTxBlocks();
    const response = await bc.getLatestTxBlock();

    expect(response.result).toMatchSchema(schemas.definitions.TxBlockObj);
    expect(parseInt((<TxBlockObj>response.result).header.BlockNum, 10)).toEqual(
      parseInt(<string>result, 10) - 1,
    );
  });

  it('should be able to get the number of Tx blocks', async () => {
    const { result: txBlock } = await bc.getLatestTxBlock();
    const { result: numTxBlocks } = await bc.getNumTxBlocks();

    expect(parseInt(<string>numTxBlocks) - 1).toBeCloseTo(
      parseInt((<TxBlockObj>txBlock).header.BlockNum),
      2,
    );
  });

  it('should be able to get the Tx block rate', async () => {
    const { result: rate } = await bc.getTxBlockRate();
    expect(<number>rate).toBeGreaterThan(0);
  });

  it('should be able to get a list of TxBlocks', async () => {
    const { result } = await bc.getNumTxBlocks();
    const numTxBlocks = parseInt(<string>result, 10);

    if (numTxBlocks > 10) {
      const numPages =
        numTxBlocks % 10 === 0
          ? numTxBlocks / 10
          : (numTxBlocks - (numTxBlocks % 10)) / 10 + 1;
      const pages: Array<Promise<RPCResponse<BlockList, string>>> = [];

      for (let i = 1; i <= numPages; i++) {
        pages.push(bc.getTxBlockListing(i));
      }

      const resolved = await Promise.all(pages);
      const receivedNumTxBlocks = resolved.reduce((n, list) => {
        return n + (<BlockList>list.result).data.length;
      }, 0);

      expect(resolved.length).toEqual(numPages);
      expect(receivedNumTxBlocks).toEqual(numTxBlocks);
    } else {
      const response = await bc.getTxBlockListing(1);
      expect((<BlockList>response.result).data.length).toEqual(numTxBlocks);
    }
  });

  it('should be able to get the total number of transactions', async () => {
    const response = await bc.getNumTransactions();
    expect(response.result).toBeTruthy();
  });

  it('should be able to get the transaction rate', async () => {
    const response = await bc.getTransactionRate();
    expect(response.result).toBeGreaterThanOrEqual(0);
  });

  it('should be able to get the current tx epoch', async () => {
    const response = await bc.getCurrentMiniEpoch();
    expect(parseInt(<string>response.result)).toBeGreaterThan(0);
  });

  it('should be able to get the current ds epoch', async () => {
    const response = await bc.getCurrentDSEpoch();
    expect(parseInt(<string>response.result)).toBeGreaterThan(0);
  });

  it('should be able to send a transaction', async () => {
    const transaction = new Transaction(
      {
        version: 0,
        toAddr: 'd11238e5fcd70c817c22922c500830d00bc1e778',
        amount: new BN(1000),
        gasPrice: new BN(1000),
        gasLimit: Long.fromNumber(1000),
      },
      provider,
    );

    const {
      txParams: { receipt },
    } = await bc.createTransaction(transaction);

    expect(receipt && receipt.success).toBe(true);
  });

  it('should be able to get a list of recent transactions', async () => {
    const response = await bc.getRecentTransactions();
    expect(response.result).toMatchSchema(schemas.definitions.TxList);
  });

  it('should be able to get the number of Txns for a given Tx epoch', async () => {
    const response = await bc.getNumTxnsTxEpoch(1);
    expect(response.result).toBeGreaterThanOrEqual(0);
  });

  it('should be able to get the number of Txns for a given DS epoch', async () => {
    const response = await bc.getNumTxnsDSEpoch(1);
    expect(parseInt(<string>response.result)).toBeGreaterThanOrEqual(0);
  });

  it('should be able to get the minimum gas price', async () => {
    const response = await bc.getMinimumGasPrice();
    expect(typeof response.result).toBe('string');
  });
});
