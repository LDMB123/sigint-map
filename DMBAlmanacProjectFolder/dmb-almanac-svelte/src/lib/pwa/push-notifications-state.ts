/**
 * Push Notification State Types
 */

export interface PushSubscriptionState {
	supported: boolean;
	permission: NotificationPermission;
	subscribed: boolean;
	subscription?: PushSubscription;
}

export interface PushError {
	code: 'unsupported' | 'permission_denied' | 'subscription_failed' | 'unknown';
	message: string;
	originalError?: Error;
}
