import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/cashier', cors: true })
export class CashierGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });

      void client.join('cashier-room');
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket): void {
    // no-op — socket.io cleans up rooms automatically
  }

  emitNewOrder(payload: object): void {
    this.server.to('cashier-room').emit('new_order', payload);
  }

  emitOrderUpdated(payload: object): void {
    this.server.to('cashier-room').emit('order_updated', payload);
  }

  emitOrderCancelled(payload: object): void {
    this.server.to('cashier-room').emit('order_cancelled', payload);
  }
}
