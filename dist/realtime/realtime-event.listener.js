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
exports.RealtimeEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const sse_service_1 = require("../sse/sse.service");
const cashier_gateway_1 = require("../gateways/cashier.gateway");
let RealtimeEventListener = class RealtimeEventListener {
    sseService;
    cashierGateway;
    constructor(sseService, cashierGateway) {
        this.sseService = sseService;
        this.cashierGateway = cashierGateway;
    }
    handleOrderSubmitted(event) {
        this.cashierGateway.emitNewOrder({ orderId: event.orderId, ...event.order });
    }
    handleOrderConfirmed(event) {
        const snapshot = {
            type: 'ORDER_CONFIRMED',
            orderId: event.orderId,
            status: 'CONFIRMED',
            currentStampCount: event.currentStampCount,
            loyaltyPoints: event.loyaltyPoints,
        };
        this.sseService.push(event.orderId, snapshot);
        this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'CONFIRMED' });
    }
    handleOrderReady(event) {
        const snapshot = {
            type: 'ORDER_READY',
            orderId: event.orderId,
            status: 'READY',
            currentStampCount: event.currentStampCount,
            loyaltyPoints: event.loyaltyPoints,
        };
        this.sseService.push(event.orderId, snapshot);
        this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'READY' });
    }
    handleRewardIssued(event) {
        const snapshot = {
            type: 'REWARD_ISSUED',
            orderId: event.orderId,
            status: event.status ?? '',
            loyaltyPoints: event.loyaltyPoints,
        };
        this.sseService.push(event.orderId, snapshot);
    }
    handleTierUpgraded(event) {
        const snapshot = {
            type: 'TIER_UPGRADED',
            orderId: event.orderId,
            status: event.status ?? '',
        };
        this.sseService.push(event.orderId, snapshot);
    }
};
exports.RealtimeEventListener = RealtimeEventListener;
__decorate([
    (0, event_emitter_1.OnEvent)('order.submitted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeEventListener.prototype, "handleOrderSubmitted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeEventListener.prototype, "handleOrderConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeEventListener.prototype, "handleOrderReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reward.issued'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeEventListener.prototype, "handleRewardIssued", null);
__decorate([
    (0, event_emitter_1.OnEvent)('user.tier_upgraded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeEventListener.prototype, "handleTierUpgraded", null);
exports.RealtimeEventListener = RealtimeEventListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sse_service_1.SseService,
        cashier_gateway_1.CashierGateway])
], RealtimeEventListener);
//# sourceMappingURL=realtime-event.listener.js.map