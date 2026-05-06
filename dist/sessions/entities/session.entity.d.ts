import { Table } from '../../users/entities/table.entity';
export declare class Session {
    id: string;
    startTime: Date;
    endTime: Date | null;
    isActive: boolean;
    table: Table;
    tableId: string;
    createdAt: Date;
    updatedAt: Date;
}
