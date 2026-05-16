import { IsUUID, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  menuItemId: string;

  @IsString()
  quantity: number;

  @IsString()
  unitPrice: number;
}

export class CreateOrderDto {
  @IsString()
  idempotencyKey: string;

  @IsUUID()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}