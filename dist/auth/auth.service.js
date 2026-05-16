"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const admin = __importStar(require("firebase-admin"));
const user_entity_1 = require("../users/entities/user.entity");
const firebase_module_1 = require("../firebase/firebase.module");
let AuthService = class AuthService {
    usersRepository;
    jwtService;
    config;
    firebaseApp;
    constructor(usersRepository, jwtService, config, firebaseApp) {
        this.usersRepository = usersRepository;
        this.jwtService = jwtService;
        this.config = config;
        this.firebaseApp = firebaseApp;
    }
    async verifyFirebaseAndLogin(idToken) {
        let decoded;
        try {
            decoded = await this.firebaseApp.auth().verifyIdToken(idToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid Firebase ID token');
        }
        const user = await this.upsertGoogleUser({
            googleId: decoded.uid,
            email: decoded.email ?? '',
            displayName: decoded.name ?? decoded.email ?? decoded.uid,
        });
        return this.issueTokens(user);
    }
    async upsertGoogleUser(profile) {
        let user = await this.usersRepository.findOne({
            where: { googleId: profile.googleId },
        });
        if (!user) {
            user = this.usersRepository.create({
                googleId: profile.googleId,
                email: profile.email,
                displayName: profile.displayName,
            });
        }
        else {
            user.email = profile.email;
            user.displayName = profile.displayName;
        }
        return this.usersRepository.save(user);
    }
    async issueTokens(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: '30d',
        });
        const hashed = await bcrypt.hash(refreshToken, 10);
        await this.usersRepository.update(user.id, { refreshToken: hashed });
        return { accessToken, refreshToken };
    }
    async refreshTokens(user) {
        return this.issueTokens(user);
    }
    async logout(userId) {
        await this.usersRepository.update(userId, { refreshToken: null });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, common_1.Inject)(firebase_module_1.FIREBASE_APP)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map