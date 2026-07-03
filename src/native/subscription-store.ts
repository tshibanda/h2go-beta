import { registerPlugin } from '@capacitor/core';

export interface SubscriptionStorePlugin {
  present(options: { groupID: string }): Promise<{ result: string }>;
  isAvailable(): Promise<{ available: boolean }>;
}

export const SubscriptionStore = registerPlugin<SubscriptionStorePlugin>('SubscriptionStore');