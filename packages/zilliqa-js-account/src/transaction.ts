import {
  GET_TX_ATTEMPTS,
  Provider,
  RPCResponse,
  Signable,
  TxBlockObj,
  RPCMethod,
  Emitter,
} from '@zilliqa-js/core';
import {
  getAddressFromPublicKey,
  getAddress,
  AddressType,
} from '@zilliqa-js/crypto';
import { BN, Long } from '@zilliqa-js/util';

import {
  TxParams,
  TxReceipt,
  TxStatus,
  TxIncluded,
  TransactionEvents,
} from './types';
import { encodeTransactionProto, sleep, eventLog, EventLog } from './util';
import { Wallet } from './wallet';

/**
 * Transaction
 *
 * Transaction is a functor. Its purpose is to encode the possible states a
 * Transaction can be in:  Confirmed, Rejected, Pending, or Initialised (i.e., not broadcasted).
 */
export class Transaction implements Signable {
  /**
   * confirm
   *
   * constructs an already-confirmed transaction.
   *
   * @static
   * @param {BaseTx} params
   */
  static confirm(params: TxParams, provider: Provider) {
    return new Transaction(params, provider, TxStatus.Confirmed);
  }

  /**
   * reject
   *
   * constructs an already-rejected transaction.
   *
   * @static
   * @param {BaseTx} params
   */
  static reject(params: TxParams, provider: Provider) {
    return new Transaction(params, provider, TxStatus.Rejected);
  }

  provider: Provider;
  id?: string;
  status: TxStatus;
  toDS: boolean;
  blockConfirmation?: number;
  emitter: Emitter;

  // parameters
  private version: number;
  private nonce?: number;
  private toAddr: string;
  private pubKey?: string;
  private amount: BN;
  private gasPrice: BN;
  private gasLimit: Long;
  private code: string = '';
  private data: string = '';
  private receipt?: TxReceipt;
  private signature?: string;

  get bytes(): Buffer {
    return encodeTransactionProto(this.txParams);
  }

  get senderAddress(): string {
    if (!this.pubKey) {
      return '0'.repeat(40);
    }

    return getAddressFromPublicKey(this.pubKey);
  }

  get txParams(): TxParams {
    return {
      version: this.version,
      // toAddr: this.normaliseAddress(this.toAddr),
      toAddr: getAddress(this.toAddr, AddressType.checkSum, [
        AddressType.bech32,
        AddressType.checkSum,
      ]),
      nonce: this.nonce,
      pubKey: this.pubKey,
      amount: this.amount,
      gasPrice: this.gasPrice,
      gasLimit: this.gasLimit,
      code: this.code,
      data: this.data,
      signature: this.signature,
      receipt: this.receipt,
    };
  }

  get payload() {
    return {
      version: 0,
      toAddr: this.toAddr,
      nonce: this.nonce,
      pubKey: this.pubKey,
      amount: this.amount.toString(),
      gasPrice: this.gasPrice.toString(),
      gasLimit: this.gasLimit.toString(),
      code: this.code,
      data: this.data,
      signature: this.signature,
      receipt: this.receipt,
    };
  }

  constructor(
    params: TxParams,
    provider: Provider,
    status: TxStatus = TxStatus.Initialised,
    toDS: boolean = false,
  ) {
    // private members
    this.version = params.version;
    // this.toAddr = this.normaliseAddress(params.toAddr);
    this.toAddr = getAddress(params.toAddr, AddressType.checkSum, [
      AddressType.bech32,
      AddressType.checkSum,
    ]);
    this.nonce = params.nonce;
    this.pubKey = params.pubKey;
    this.amount = params.amount;
    this.code = params.code || '';
    this.data = params.data || '';
    this.signature = params.signature;
    this.gasPrice = params.gasPrice;
    this.gasLimit = params.gasLimit;
    this.receipt = params.receipt;

    // public members
    this.provider = provider;
    this.status = status;
    this.toDS = toDS;
    this.blockConfirmation = 0;
    this.emitter = new Emitter();
  }

  /**
   * isPending
   *
   * @returns {boolean}
   */
  isPending(): boolean {
    return this.status === TxStatus.Pending;
  }

  /**
   * isInitialised
   *
   * @returns {boolean}
   */
  isInitialised(): boolean {
    return this.status === TxStatus.Initialised;
  }

  /**
   * isConfirmed
   *
   * @returns {boolean}
   */
  isConfirmed(): boolean {
    return this.status === TxStatus.Confirmed;
  }

  /**
   * isRejected
   *
   * @returns {boolean}
   */
  isRejected(): boolean {
    return this.status === TxStatus.Rejected;
  }

  /**
   * setProvider
   *
   * Sets the provider on this instance.
   *
   * @param {Provider} provider
   */
  setProvider(provider: Provider) {
    this.provider = provider;
  }

  /**
   * setStatus
   *
   * Escape hatch to imperatively set the state of the transaction.
   *
   * @param {TxStatus} status
   * @returns {undefined}
   */
  setStatus(status: TxStatus) {
    this.status = status;
    return this;
  }

  /**
   * blockConfirm
   *
   * Use `RPCMethod.GetLatestBlock` to get latest blockNumber
   * Use interval to get the latestBlockNumber
   * After BlockNumber change, then we use `RPCMethod.GetTransaction` to get the receipt
   *
   * @param {string} txHash
   * @param {number} maxblockCount
   * @param {number} interval interval in milliseconds
   * @returns {Promise<Transaction>}
   */
  async blockConfirm(
    txHash: string,
    maxblockCount: number = 4,
    interval: number = 1000,
  ) {
    this.status = TxStatus.Pending;
    const blockStart: BN = await this.getBlockNumber();
    let blockChecked = blockStart;
    for (let attempt = 0; attempt < maxblockCount; attempt += 1) {
      try {
        const blockLatest: BN = await this.getBlockNumber();
        const blockNext: BN = blockChecked.add(
          new BN(attempt === 0 ? attempt : 1),
        );
        if (blockLatest.gte(blockNext)) {
          blockChecked = blockLatest;
          if (await this.trackTx(txHash)) {
            this.blockConfirmation = blockLatest.sub(blockStart).toNumber();
            return this;
          }
        } else {
          attempt = attempt - 1 >= 0 ? attempt - 1 : 0;
        }
      } catch (err) {
        this.status = TxStatus.Rejected;
        throw err;
      }

      if (attempt + 1 < maxblockCount) {
        await sleep(interval);
      }
    }

    // if failed
    const blockFailed: BN = await this.getBlockNumber();
    this.blockConfirmation = blockFailed.sub(blockStart).toNumber();
    this.status = TxStatus.Rejected;
    this.emitEventLog(
      eventLog(TransactionEvents.confirm, txHash, TxStatus.Rejected),
    );
    const errorMessage = `The transaction is still not confirmed after ${maxblockCount} blocks.`;
    this.emitEventLog(eventLog(TransactionEvents.error, txHash, errorMessage));
    throw new Error(errorMessage);
  }
  /**
   * confirmReceipt
   *
   * Similar to the Promise API. This sets the Transaction instance to a state
   * of pending. Calling this function kicks off a passive loop that polls the
   * lookup node for confirmation on the txHash.
   *
   * The polls are performed with a linear backoff:
   *
   * `const delay = interval * attempt`
   *
   * This is a low-level method that you should generally not have to use
   * directly.
   *
   * @param {string} txHash
   * @param {number} maxAttempts
   * @param {number} initial interval in milliseconds
   * @returns {Promise<Transaction>}
   */
  async confirm(
    txHash: string,
    maxAttempts = GET_TX_ATTEMPTS,
    interval = 1000,
  ): Promise<Transaction> {
    this.status = TxStatus.Pending;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (await this.trackTx(txHash)) {
          return this;
        }
      } catch (err) {
        this.status = TxStatus.Rejected;
        throw err;
      }
      if (attempt + 1 < maxAttempts) {
        await sleep(interval * attempt);
      }
    }
    this.status = TxStatus.Rejected;
    this.emitEventLog(
      eventLog(TransactionEvents.confirm, txHash, TxStatus.Rejected),
    );
    const errorMessage = `The transaction is still not confirmed after ${maxAttempts} attempts.`;
    this.emitEventLog(eventLog(TransactionEvents.error, txHash, errorMessage));
    throw new Error(errorMessage);
  }

  /**
   * map
   *
   * maps over the transaction, allowing for manipulation.
   *
   * @param {(prev: TxParams) => TxParams} fn - mapper
   * @returns {Transaction}
   */
  map(fn: (prev: TxParams) => TxParams): Transaction {
    const newParams = fn(this.txParams);
    this.setParams(newParams);

    return this;
  }

  async getSigned(signer: Wallet): Promise<Transaction> {
    const result = await signer.sign(this);
    this.setParams(result.txParams);
    return this;
  }

  async sendTransaction(): Promise<[Transaction, string]> {
    // TODO: we use eth RPC setting for now, incase we have other params, we should add here
    if (this.signature === undefined) {
      throw new Error('Transaction not signed');
    }

    const response = await this.provider.send(RPCMethod.CreateTransaction, {
      ...this.txParams,
      priority: this.toDS,
    });

    if (response.error) {
      this.emitEventLog(
        eventLog(TransactionEvents.error, response.error, 'Transaction Error'),
      );
      throw response.error;
    }
    this.emitEventLog(
      eventLog(
        TransactionEvents.id,
        response.result.TranID,
        'Got Transaction ID',
      ),
    );
    return [this, response.result.TranID];
  }

  private setParams(params: TxParams) {
    this.version = params.version;
    // this.toAddr = this.normaliseAddress(params.toAddr);
    this.toAddr = getAddress(params.toAddr, AddressType.checkSum, [
      AddressType.bech32,
      AddressType.checkSum,
    ]);
    this.nonce = params.nonce;
    this.pubKey = params.pubKey;
    this.amount = params.amount;
    this.code = params.code || '';
    this.data = params.data || '';
    this.signature = params.signature;
    this.gasPrice = params.gasPrice;
    this.gasLimit = params.gasLimit;
    this.receipt = params.receipt;
  }

  private async trackTx(txHash: string): Promise<boolean> {
    const res: RPCResponse<TxIncluded, string> = await this.provider.send(
      RPCMethod.GetTransaction,
      txHash,
    );

    if (res.error) {
      this.emitEventLog(
        eventLog(TransactionEvents.track, txHash, res.error.message),
      );
      return false;
    }

    this.id = res.result.ID;
    this.receipt = {
      ...res.result.receipt,
      cumulative_gas: parseInt(res.result.receipt.cumulative_gas, 10),
    };
    this.emitEventLog(
      eventLog(TransactionEvents.receipt, txHash, this.receipt),
    );
    this.status =
      this.receipt && this.receipt.success
        ? TxStatus.Confirmed
        : TxStatus.Rejected;

    if (this.status === TxStatus.Confirmed) {
      this.emitEventLog(
        eventLog(TransactionEvents.confirm, txHash, TxStatus.Confirmed),
      );
    } else if (this.status === TxStatus.Rejected) {
      this.emitEventLog(
        eventLog(TransactionEvents.confirm, txHash, TxStatus.Rejected),
      );
    }
    return true;
  }

  private async getBlockNumber(): Promise<BN> {
    try {
      const res: RPCResponse<TxBlockObj, string> = await this.provider.send(
        RPCMethod.GetLatestTxBlock,
      );
      if (res.error === undefined && res.result.header.BlockNum) {
        // if blockNumber is too high, we use BN to be safer
        return new BN(res.result.header.BlockNum);
      } else {
        throw new Error('Can not get latest BlockNumber');
      }
    } catch (error) {
      throw error;
    }
  }

  private emitEventLog(log: EventLog) {
    this.emitter.emit(log.eventName, log);
  }
}
