"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const env_validation_1 = require("./config/env.validation");
const user_entity_1 = require("./users/entities/user.entity");
const table_entity_1 = require("./users/entities/table.entity");
const menu_item_entity_1 = require("./menu/entities/menu-item.entity");
const session_entity_1 = require("./sessions/entities/session.entity");
const order_entity_1 = require("./orders/entities/order.entity");
const order_item_entity_1 = require("./orders/entities/order-item.entity");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const menu_module_1 = require("./menu/menu.module");
const sessions_module_1 = require("./sessions/sessions.module");
const orders_module_1 = require("./orders/orders.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const realtime_module_1 = require("./realtime/realtime.module");
const firebase_module_1 = require("./firebase/firebase.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: env_validation_1.envValidationSchema,
            }),
            event_emitter_1.EventEmitterModule.forRoot(),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.get('DATABASE_URL'),
                    entities: [user_entity_1.User, table_entity_1.Table, menu_item_entity_1.MenuItem, session_entity_1.Session, order_entity_1.Order, order_item_entity_1.OrderItem],
                    synchronize: config.get('NODE_ENV') !== 'production',
                    ssl: config.get('NODE_ENV') === 'production'
                        ? { rejectUnauthorized: false }
                        : false,
                }),
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            menu_module_1.MenuModule,
            sessions_module_1.SessionsModule,
            orders_module_1.OrdersModule,
            realtime_module_1.RealtimeModule,
            firebase_module_1.FirebaseAdminModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map