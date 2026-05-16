import * as admin from 'firebase-admin';
export interface PushPayload {
    type: string;
    orderId: string;
}
export declare class NotificationsService {
    private readonly firebaseApp;
    private readonly logger;
    constructor(firebaseApp: admin.app.App);
    sendPush(fcmToken: string, data: PushPayload): Promise<void>;
}
