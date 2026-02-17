/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';

export interface Relation {
  id: string;
  partnerName: string;
  type: 'Marriage' | 'Partnership' | 'Alliance';
  status: 'Active' | 'Pending';
  startDate: number;
}

export class SocialService {
  private static instance: SocialService;
  private relations: Relation[] = [];

  private constructor() {}

  public static getInstance(config: Config): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  public getRelations(): Relation[] {
    return this.relations;
  }

  public addRelation(partnerName: string, type: 'Marriage' | 'Partnership' | 'Alliance'): void {
    this.relations.push({
      id: `rel-${Date.now()}`,
      partnerName,
      type,
      status: 'Active',
      startDate: Date.now()
    });
  }
}
