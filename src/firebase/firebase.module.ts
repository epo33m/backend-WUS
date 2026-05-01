import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_APP = 'FIREBASE_APP';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (config: ConfigService): admin.app.App => {
        const serviceAccount = JSON.parse(
          config.getOrThrow<string>('FIREBASE_SERVICE_ACCOUNT_JSON'),
        ) as admin.ServiceAccount;
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
  ],
  exports: [FIREBASE_APP],
})
export class FirebaseAdminModule {}
