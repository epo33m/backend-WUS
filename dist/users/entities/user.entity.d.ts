import { UserTier } from '../enums/user-tier.enum';
export declare class User {
    id: string;
    googleId: string;
    email: string;
    displayName: string;
    fcmToken: string | null;
    loyaltyPoints: number;
    lifetimePoints: number;
    currentTier: UserTier;
    purchaseCount: number;
    currentStampCount: number;
    refreshToken: string | null;
    createdAt: Date;
}
