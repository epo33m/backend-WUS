"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashierGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let CashierGateway = class CashierGateway {
    jwtService;
    config;
    server;
    constructor(jwtService, config) {
        this.jwtService = jwtService;
        this.config = config;
    }
    handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ??
                client.handshake.query?.token;
            if (!token) {
                client.disconnect(true);
                return;
            }
            this.jwtService.verify(token, {
                secret: this.config.getOrThrow('JWT_SECRET'),
            });
            void client.join('cashier-room');
        }
        catch {
            client.disconnect(true);
        }
    }
    handleDisconnect(_client) {
    }
    emitNewOrder(payload) {
        this.server.to('cashier-room').emit('new_order', payload);
    }
    emitOrderUpdated(payload) {
        this.server.to('cashier-room').emit('order_updated', payload);
    }
    emitOrderCancelled(payload) {
        this.server.to('cashier-room').emit('order_cancelled', payload);
    }
};
exports.CashierGateway = CashierGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CashierGateway.prototype, "server", void 0);
exports.CashierGateway = CashierGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/cashier', cors: true }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], CashierGateway);
//# sourceMappingURL=cashier.gateway.js.map