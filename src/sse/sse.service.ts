import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface OrderSnapshot {
  type: string;
  orderId: string;
  status: string;
  currentStampCount?: number;
  loyaltyPoints?: number;
}

@Injectable()
export class SseService {
  private readonly subjects = new Map<string, Subject<OrderSnapshot>>();

  getSubject(orderId: string): Subject<OrderSnapshot> {
    if (!this.subjects.has(orderId)) {
      this.subjects.set(orderId, new Subject<OrderSnapshot>());
    }
    return this.subjects.get(orderId)!;
  }

  push(orderId: string, snapshot: OrderSnapshot): void {
    const subject = this.subjects.get(orderId);
    if (subject) {
      subject.next(snapshot);
    }
  }

  complete(orderId: string): void {
    const subject = this.subjects.get(orderId);
    if (subject) {
      subject.complete();
      this.subjects.delete(orderId);
    }
  }
}
