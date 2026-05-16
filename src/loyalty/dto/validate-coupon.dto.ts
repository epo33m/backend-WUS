import { IsString, IsInt, IsPositive } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsInt()
  @IsPositive()
  orderTotal: number;
}
