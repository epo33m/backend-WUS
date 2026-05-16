import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class CashierGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly config;
    server: Server;
    constructor(jwtService: JwtService, config: ConfigService);
    handleConnection(client: Socket): void;
    handleDisconnect(_client: Socket): void;
    emitNewOrder(payload: object): void;
    emitOrderUpdated(payload: object): void;
    emitOrderCancelled(payload: object): void;
}
