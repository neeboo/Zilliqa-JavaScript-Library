import { Transaction, Wallet, util } from '@zilliqa-js/account';
import { ContractObj, Value } from '@zilliqa-js/contract';
import {
  GET_TX_ATTEMPTS,
  sign,
  Provider,
  ZilliqaModule,
  RPCResponse,
  RPCMethod,
  BlockchainInfo,
  DsBlockObj,
  BlockList,
  TxBlockObj,
  TxList,
  TransactionObj,
  ShardingStructure,
  Emitter,
} from '@zilliqa-js/core';

import { Omit } from 'utility-types';

import { toTxParams } from './util';

export class Blockchain implements ZilliqaModule {
  signer: Wallet;
  provider: Provider;

  constructor(provider: Provider, signer: Wallet) {
    this.provider = provider;
    this.provider.middleware.request.use(
      util.formatOutgoingTx,
      RPCMethod.CreateTransaction,
    );
    this.signer = signer;
  }

  /**
   * getBlockChainInfo
   *
   * @returns {Promise<RPCResponse<BlockchainInfo, string>>}
   */
  getBlockChainInfo(): Promise<RPCResponse<BlockchainInfo, string>> {
    return this.provider.send(RPCMethod.GetBlockchainInfo);
  }

  /**
   * getShardingStructure
   *
   * @returns {Promise<RPCResponse<ShardingStructure, string>>}
   */
  getShardingStructure(): Promise<RPCResponse<ShardingStructure, string>> {
    return this.provider.send(RPCMethod.GetShardingStructure);
  }

  /**
   * getDSBlock
   *
   * Get details of a Directory Service block by block number.
   *
   * @param {number} blockNum
   * @returns {Promise<RPCResponse<DsBlockObj, string>>}
   */
  getDSBlock(blockNum: number): Promise<RPCResponse<DsBlockObj, string>> {
    return this.provider.send(RPCMethod.GetDSBlock, blockNum.toString());
  }

  /**
   * getLatestDSBlock
   *
   * Get details of the most recent Directory Service block.
   *
   * @returns {Promise<RPCResponse<DsBlockObj, string>>}
   */
  getLatestDSBlock(): Promise<RPCResponse<DsBlockObj, string>> {
    return this.provider.send(RPCMethod.GetLatestDSBlock);
  }

  /**
   * getNumDSBlocks
   *
   * Gets the number of DS blocks that the network has processed.
   *
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getNumDSBlocks(): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetNumDSBlocks);
  }

  /**
   * getDSBlockRate
   *
   * Gets the average rate of DS blocks processed per second
   *
   * @returns {Promise<RPCResponse<number, string>>}
   */
  getDSBlockRate(): Promise<RPCResponse<number, string>> {
    return this.provider.send(RPCMethod.GetDSBlockRate);
  }

  /**
   * getDSBlockListing
   *
   * Get a paginated list of Directory Service blocks. Pass in page number as
   * parameter. Returns a maxPages variable that specifies the max number of
   * pages. 1 - latest blocks, maxPages - oldest blocks.
   *
   * @param {number} max
   * @returns {Promise<RPCResponse<BlockList, string>>}
   */
  getDSBlockListing(max: number): Promise<RPCResponse<BlockList, string>> {
    return this.provider.send(RPCMethod.DSBlockListing, max);
  }

  /**
   * getTxBlock
   *
   * Get details of a Transaction block by block number.
   *
   * @param {number} blockNum
   * @returns {Promise<RPCResponse<TxBlockObj, string>>}
   */
  getTxBlock(blockNum: number): Promise<RPCResponse<TxBlockObj, string>> {
    return this.provider.send(RPCMethod.GetTxBlock, blockNum.toString());
  }

  /**
   * getLatestTxBlock
   *
   * Get details of the most recent Transaction block.
   *
   * @returns {Promise<RPCResponse<TxBlockObj, string>>}
   */
  getLatestTxBlock(): Promise<RPCResponse<TxBlockObj, string>> {
    return this.provider.send(RPCMethod.GetLatestTxBlock);
  }

  /**
   * getNumTxBlocks
   *
   * Gets the total number of TxBlocks.
   *
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getNumTxBlocks(): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetNumTxBlocks);
  }

  /**
   * getTxBlockRate
   *
   * Gets the average number of Tx blocks per second.
   *
   * @returns {Promise<RPCResponse<number, string>>}
   */
  getTxBlockRate(): Promise<RPCResponse<number, string>> {
    return this.provider.send(RPCMethod.GetTxBlockRate);
  }

  /**
   * getTxBlockListing
   *
   * Get a paginated list of Transaction blocks. Takes a page number as
   * parameter, where each page contains a list of 10 blocks (max). Returns
   * a maxPages variable that specifies the max number of pages. 1 - latest
   * blocks, maxPages - oldest blocks.
   *
   * @param {number} max
   * @returns {Promise<RPCResponse<BlockList, string>>}
   */
  getTxBlockListing(max: number): Promise<RPCResponse<BlockList, string>> {
    return this.provider.send(RPCMethod.TxBlockListing, max);
  }

  /**
   * getNumTransactions
   *
   * Gets the number of transactions processed by the network so far.
   *
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getNumTransactions(): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetNumTransactions);
  }

  /**
   * getTransactionRate
   *
   * Gets the number of transactions processed per second
   *
   * @returns {Promise<RPCResponse<number, string>>}
   */
  getTransactionRate(): Promise<RPCResponse<number, string>> {
    return this.provider.send(RPCMethod.GetTransactionRate);
  }

  /**
   * getCurrentMiniEpoch
   *
   * Gets the current Tx Epoch.
   *
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getCurrentMiniEpoch(): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetCurrentMiniEpoch);
  }

  /**
   * getCurrentDSEpoch
   *
   * Gets the current DS Epoch.
   *
   * @returns {Promise<RPCResponse<any, string>>}
   */
  getCurrentDSEpoch(): Promise<RPCResponse<any, string>> {
    return this.provider.send(RPCMethod.GetCurrentDSEpoch);
  }

  /**
   * getPrevDifficulty
   *
   * Gets shard difficulty for previous PoW round
   *
   * @returns {Promise<RPCResponse<number, string>>}
   */
  getPrevDifficulty(): Promise<RPCResponse<number, string>> {
    return this.provider.send(RPCMethod.GetPrevDifficulty);
  }

  /**
   * getPrevDSDifficulty
   *
   * Gets DS difficulty for previous PoW round
   *
   * @returns {Promise<RPCResponse<number, string>>}
   */
  getPrevDSDifficulty(): Promise<RPCResponse<number, string>> {
    return this.provider.send(RPCMethod.GetPrevDSDifficulty);
  }

  /**
   * createTransaction
   *
   * Creates a transaction and polls the lookup node for a transaction
   * receipt. The transaction is considered to be lost if it is not confirmed
   * within the timeout period.
   *
   * @param {Transaction} tx
   * @param {number} maxAttempts - (optional) number of times to poll before timing out
   * @param {number} number - (optional) interval in ms
   * @returns {Promise<Transaction>} - the Transaction that has been signed and
   * broadcasted to the network.
   */
  @sign
  async createTransaction(
    tx: Transaction,
    maxAttempts: number = GET_TX_ATTEMPTS,
    interval: number = 1000,
  ): Promise<Transaction> {
    try {
      const response = await this.provider.send(RPCMethod.CreateTransaction, {
        ...tx.txParams,
        priority: tx.toDS,
      });

      if (response.error) {
        throw response.error;
      }

      return tx.confirm(response.result.TranID, maxAttempts, interval);
    } catch (err) {
      throw err;
    }
  }

  createObservedTransaction(
    tx: Transaction,
    maxAttempts: number = GET_TX_ATTEMPTS,
    interval: number = 1000,
    blockConfirm: boolean = true,
  ): Emitter {
    try {
      tx.getSigned(this.signer).then((signed) => {
        signed.sendTransaction().then((response) => {
          const [txReturned, TranID] = response;
          signed = txReturned;
          if (!blockConfirm) {
            signed.confirm(TranID, maxAttempts, interval).then(() => {
              signed.emitter.resolve(signed);
            });
          }
          signed.blockConfirm(TranID, maxAttempts, interval).then(() => {
            signed.emitter.resolve(signed);
          });
        });
      });
      return tx.emitter;
    } catch (err) {
      throw err;
    }
  }

  /**
   * getTransaction
   *
   * Retrieves a transaction from the blockchain by its hash. If the result
   * contains an Error, a rejected Promise is returned with the erorr message.
   * If it does not contained an error, but `receipt.success` is `false`, then
   * a rejected Transaction instance is returned.
   *
   * @param {string} txHash
   * @returns {Promise<any>}
   */
  async getTransaction(txHash: string): Promise<Transaction> {
    try {
      const response = await this.provider.send<TransactionObj>(
        RPCMethod.GetTransaction,
        txHash,
      );

      if (response.error) {
        return Promise.reject(response.error);
      }

      return response.result.receipt.success
        ? Transaction.confirm(toTxParams(response), this.provider)
        : Transaction.reject(toTxParams(response), this.provider);
    } catch (err) {
      throw err;
    }
  }

  /**
   * getRecentTransactions
   *
   * Gets a list of recent transactions
   *
   * @returns {Promise<RPCResponse<TxList, never>>}
   */
  getRecentTransactions(): Promise<RPCResponse<TxList, never>> {
    return this.provider.send(RPCMethod.GetRecentTransactions);
  }

  /**
   * getTransactionsForTxBlock
   *
   * Gets all transactions for a given TxBlock, grouped by shard id
   *
   * @param {number} txBlock
   * @returns {Promise<RPCResponse<string[][], string>>}
   */
  getTransactionsForTxBlock(
    txBlock: number,
  ): Promise<RPCResponse<string[][], string>> {
    return this.provider.send(
      RPCMethod.GetTransactionsForTxBlock,
      txBlock.toString(),
    );
  }

  /**
   * getNumTxnsTxEpoch
   *
   * Gets the number of transactions procesed for a given Tx Epoch.
   *
   * @param {number} epoch
   * @returns {Promise<RPCResponse<number, never>>}
   */
  getNumTxnsTxEpoch(epoch: number): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetNumTxnsTxEpoch, epoch);
  }

  /**
   * getNumTxnsDSEpoch
   *
   * Gets the number of transactions procesed for a given DS Epoch.
   *
   * @param {number} epoch
   * @returns {Promise<any>}
   */
  getNumTxnsDSEpoch(epoch: number): Promise<RPCResponse<string, string>> {
    return this.provider.send(RPCMethod.GetNumTxnsDSEpoch, epoch);
  }

  /**
   * getMinimumGasPrice
   *
   * Gets the numeric minimum gas price
   *
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getMinimumGasPrice() {
    return this.provider.send<string, string>(RPCMethod.GetMinimumGasPrice);
  }

  /**
   * getBalance
   *
   * Gets the balance of an account by address
   *
   * @param {string} address
   * @returns {Promise<RPCResponse<any, string>>}
   */
  getBalance(address: string): Promise<RPCResponse<any, string>> {
    return this.provider.send(RPCMethod.GetBalance, address);
  }

  /**
   * getSmartContractCode
   *
   * @param {string} address
   * @returns {Promise<RPCResponse< code: string }, string>>}
   */
  getSmartContractCode(
    address: string,
  ): Promise<RPCResponse<{ code: string }, string>> {
    return this.provider.send(RPCMethod.GetSmartContractCode, address);
  }

  /**
   * getSmartContractInit
   *
   * @param {string} address
   * @returns {Promise<RPCResponse<Value[], string>>}
   */
  getSmartContractInit(address: string): Promise<RPCResponse<Value[], string>> {
    return this.provider.send(RPCMethod.GetSmartContractInit, address);
  }

  /**
   * getSmartContractState
   *
   * @param {string} address
   * @returns {Promise<RPCResponse<Value[], string>>}
   */
  getSmartContractState(
    address: string,
  ): Promise<RPCResponse<Value[], string>> {
    return this.provider.send(RPCMethod.GetSmartContractState, address);
  }

  /**
   * getSmartContracts
   *
   * @param {string} address
   * @returns {Promise<RPCResponse<Omit<ContractObj, 'init' | 'abi'>, string>>}
   */
  getSmartContracts(
    address: string,
  ): Promise<RPCResponse<Omit<ContractObj, 'init' | 'abi'>, string>> {
    return this.provider.send(RPCMethod.GetSmartContracts, address);
  }

  /**
   * getContractAddressFromTransactionID
   *
   * @param {string} txHash
   * @returns {Promise<RPCResponse<string, string>>}
   */
  getContractAddressFromTransactionID(
    txHash: string,
  ): Promise<RPCResponse<string, string>> {
    return this.provider.send(
      RPCMethod.GetContractAddressFromTransactionID,
      txHash,
    );
  }
}
