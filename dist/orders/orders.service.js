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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const session_entity_1 = require("../sessions/entities/session.entity");
const menu_item_entity_1 = require("../menu/entities/menu-item.entity");
let OrdersService = class OrdersService {
    orderRepository;
    orderItemRepository;
    sessionRepository;
    menuItemRepository;
    dataSource;
    constructor(orderRepository, orderItemRepository, sessionRepository, menuItemRepository, dataSource) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.sessionRepository = sessionRepository;
        this.menuItemRepository = menuItemRepository;
        this.dataSource = dataSource;
    }
    async createOrder(createOrderDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const existingOrder = await queryRunner.manager.findOne(order_entity_1.Order, {
                where: { idempotencyKey: createOrderDto.idempotencyKey },
            });
            if (existingOrder) {
                throw new common_1.ConflictException('Order already exists with this idempotency key');
            }
            const session = await queryRunner.manager.findOne(session_entity_1.Session, {
                where: { id: createOrderDto.sessionId },
            });
            if (!session || !session.isActive) {
                throw new common_1.BadRequestException('Invalid or inactive session');
            }
            let totalAmount = 0;
            const orderItems = [];
            for (const item of createOrderDto.items) {
                const menuItem = await queryRunner.manager.findOne(menu_item_entity_1.MenuItem, {
                    where: { id: item.menuItemId, isAvailable: true },
                });
                if (!menuItem) {
                    throw new common_1.BadRequestException(`Menu item ${item.menuItemId} not available`);
                }
                const orderItem = queryRunner.manager.create(order_item_entity_1.OrderItem, {
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                });
                orderItems.push(orderItem);
                totalAmount += item.quantity * item.unitPrice;
            }
            if (createOrderDto.couponCode) {
            }
            const order = queryRunner.manager.create(order_entity_1.Order, {
                idempotencyKey: createOrderDto.idempotencyKey,
                sessionId: createOrderDto.sessionId,
                status: order_entity_1.OrderStatus.PENDING,
                totalAmount,
            });
            const savedOrder = await queryRunner.manager.save(order_entity_1.Order, order);
            for (const item of orderItems) {
                item.orderId = savedOrder.id;
                await queryRunner.manager.save(order_item_entity_1.OrderItem, item);
            }
            await queryRunner.commitTransaction();
            return savedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            if (error.code === '23505') {
                throw new common_1.ConflictException('Idempotency key conflict');
            }
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findOrderById(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['items', 'items.menuItem'],
        });
        if (!order) {
            throw new common_1.BadRequestException('Order not found');
        }
        return order;
    }
    async cancelOrder(id) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const order = await queryRunner.manager.findOne(order_entity_1.Order, { where: { id } });
            if (!order) {
                throw new common_1.BadRequestException('Order not found');
            }
            if (order.status === order_entity_1.OrderStatus.PAID) {
                throw new common_1.BadRequestException('Cannot cancel a paid order');
            }
            order.status = order_entity_1.OrderStatus.CANCELLED;
            const updatedOrder = await queryRunner.manager.save(order_entity_1.Order, order);
            await queryRunner.commitTransaction();
            return updatedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findOrders() {
        return this.orderRepository.find({
            relations: ['session', 'session.table'],
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async reserveCoupon(queryRunner, couponCode) {
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(3, (0, typeorm_1.InjectRepository)(menu_item_entity_1.MenuItem)),
    __param(4, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], OrdersService);
//# sourceMappingURL=orders.service.js.map