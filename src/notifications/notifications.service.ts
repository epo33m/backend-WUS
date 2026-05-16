import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';

export interface PushPayload {
  type: string;
  orderId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
  ) {}

  async sendPush(fcmToken: string, data: PushPayload): Promise<void> {
    try {
      await this.firebaseApp.messaging().send({
        token: fcmToken,
        data: { type: data.type, orderId: data.orderId },
      });
    } catch (err) {
      this.logger.error(`Failed to send push to token ${fcmToken}`, err);
    }
  }
}
