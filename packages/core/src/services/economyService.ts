/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';

export interface BankAccount {
  balance: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  timestamp: number;
  type: 'credit' | 'debit';
}

export interface BazaarItem {
  id: string;
  name: string;
  description: string;
  price: number;
  seller: string;
}

const MOCK_BAZAAR_ITEMS: BazaarItem[] = [
    { id: '1', name: 'Premium Analytics Agent', description: 'Advanced data analysis agent.', price: 500, seller: 'System' },
    { id: '2', name: 'Creative Writing Prompt Pack', description: '50+ prompts for storytellers.', price: 100, seller: 'System' },
    { id: '3', name: 'Code Reviewer Agent', description: 'Specialized node.js code reviewer.', price: 300, seller: 'System' },
];

export class EconomyService {
  private static instance: EconomyService;
  private account: BankAccount = {
    balance: 1000,
    transactions: [
        { id: 'tx-init', amount: 1000, description: 'Initial Deposit', timestamp: Date.now(), type: 'credit' }
    ]
  };
  private bazaarItems: BazaarItem[] = [...MOCK_BAZAAR_ITEMS];

  private constructor() {}

  public static getInstance(config: Config): EconomyService {
    if (!EconomyService.instance) {
      EconomyService.instance = new EconomyService();
    }
    return EconomyService.instance;
  }

  public getAccount(): BankAccount {
    return this.account;
  }

  public getBazaarItems(): BazaarItem[] {
    return this.bazaarItems;
  }

  public processTransaction(amount: number, description: string, type: 'credit' | 'debit'): boolean {
    if (type === 'debit' && this.account.balance < amount) {
        return false;
    }
    
    this.account.balance += (type === 'credit' ? amount : -amount);
    this.account.transactions.unshift({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount,
        description,
        timestamp: Date.now(),
        type
    });
    return true;
  }

  public getGlobalMarketFeed(): string[] {
      // Simulate live market activity
      const stocks = ['AGI', 'COMP', 'DATA', 'MEME', 'CORE'];
      const actions = ['BUY', 'SELL'];
      const feed: string[] = [];
      for (let i = 0; i < 10; i++) {
          const stock = stocks[Math.floor(Math.random() * stocks.length)];
          const action = actions[Math.floor(Math.random() * actions.length)];
          const price = (Math.random() * 1000).toFixed(2);
          feed.push(`[${new Date().toLocaleTimeString()}] GLOBAL: ${action} ${stock} @ ${price}c`);
      }
      return feed;
  }
}
