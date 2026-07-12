import { registerPlugin } from "@capacitor/core";

export interface SubscriptionManagementPlugin {
  openManageSubscriptions(): Promise<void>;
}

export const SubscriptionManagement = registerPlugin<SubscriptionManagementPlugin>("SubscriptionManagement");