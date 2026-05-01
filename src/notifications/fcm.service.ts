import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const credentialsJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!credentialsJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM disabled');
      return;
    }

    try {
      const credential = admin.credential.cert(
        JSON.parse(credentialsJson) as admin.ServiceAccount,
      );
      this.app = admin.initializeApp({ credential }, 'fcm');
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin', err);
    }
  }

  async sendDataNotification(
    fcmToken: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (!this.app || !fcmToken) {
      return;
    }

    try {
      await this.app.messaging().send({
        token: fcmToken,
        data,
        android: { priority: 'high' },
      });
    } catch (err) {
      this.logger.error(`FCM send failed for token ${fcmToken}`, err);
    }
  }
}
