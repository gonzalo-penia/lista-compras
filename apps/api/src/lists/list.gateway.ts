import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe, ParseUUIDPipe } from '@nestjs/common';
import { IsString, IsUUID, IsBoolean, IsNumber, IsOptional, MinLength, MaxLength, Min, IsPositive } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ListService } from './list.service';
import { FamilyService } from '../families/family.service';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class AddItemDto {
  @IsUUID()
  listId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @IsOptional()
  unit?: string;
}

class UpdateItemDto {
  @IsUUID()
  listId!: string;

  @IsUUID()
  itemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number | null;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @IsOptional()
  unit?: string | null;
}

class ToggleItemDto {
  @IsUUID()
  listId!: string;

  @IsUUID()
  itemId!: string;

  @IsBoolean()
  checked!: boolean;
}

class ItemRefDto {
  @IsUUID()
  listId!: string;

  @IsUUID()
  itemId!: string;
}

class AddExpenseDto {
  @IsUUID()
  listId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  description?: string;
}

class ExpenseRefDto {
  @IsUUID()
  listId!: string;

  @IsUUID()
  expenseId!: string;
}

// ── Gateway ───────────────────────────────────────────────────────────────────

interface AuthSocket extends Socket {
  userId: string;
}

// 20 eventos por segundo por usuario
const WS_THROTTLE_MAX = 20;
const WS_THROTTLE_WINDOW_MS = 1_000;

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ListGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly eventLog = new Map<string, number[]>();

  constructor(
    private readonly listService: ListService,
    private readonly familyService: FamilyService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: AuthSocket) {
    try {
      const cookieHeader = client.handshake.headers.cookie ?? '';
      const token = cookieHeader
        .split(';')
        .map((c) => c.trim().split('='))
        .find(([k]) => k === 'access_token')?.[1];

      if (!token) throw new Error('No token');
      const payload = this.jwtService.verify<{ sub: string }>(decodeURIComponent(token));
      client.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.eventLog.delete(client.userId);
  }

  private enforceThrottle(userId: string): void {
    const now = Date.now();
    const timestamps = (this.eventLog.get(userId) ?? []).filter(
      (t) => now - t < WS_THROTTLE_WINDOW_MS,
    );
    if (timestamps.length >= WS_THROTTLE_MAX) {
      throw new WsException('Too many requests');
    }
    timestamps.push(now);
    this.eventLog.set(userId, timestamps);
  }

  private async assertFamilyAccess(userId: string, familyId: string): Promise<void> {
    if (!(await this.familyService.isMember(userId, familyId))) {
      throw new WsException('Access denied');
    }
  }

  private async assertListAccess(userId: string, listId: string): Promise<string> {
    this.enforceThrottle(userId);
    const list = await this.listService.findById(listId);
    await this.assertFamilyAccess(userId, list.familyId);
    return list.familyId;
  }

  // ── Sala de familia ──────────────────────────────────────────────────────────

  @SubscribeMessage('family:join')
  async handleJoinFamily(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody(new ParseUUIDPipe()) familyId: string,
  ) {
    await this.assertFamilyAccess(client.userId, familyId);
    client.join(`family:${familyId}`);
  }

  @SubscribeMessage('family:leave')
  handleLeaveFamily(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody(new ParseUUIDPipe()) familyId: string,
  ) {
    client.leave(`family:${familyId}`);
  }

  notifyListCreated(familyId: string, list: unknown) {
    this.server.to(`family:${familyId}`).emit('list:added', list);
  }

  notifyListDeleted(familyId: string, listId: string) {
    this.server.to(`family:${familyId}`).emit('list:deleted', { id: listId });
  }

  // ── Sala de lista ─────────────────────────────────────────────────────────────

  @SubscribeMessage('list:join')
  async handleJoinList(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody(new ParseUUIDPipe()) listId: string,
  ) {
    await this.assertListAccess(client.userId, listId);
    client.join(`list:${listId}`);
  }

  @SubscribeMessage('list:leave')
  handleLeaveList(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody(new ParseUUIDPipe()) listId: string,
  ) {
    client.leave(`list:${listId}`);
  }

  // ── Ítems ────────────────────────────────────────────────────────────────────

  @SubscribeMessage('item:add')
  async handleAddItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: AddItemDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    const item = await this.listService.addItem(data.listId, data, client.userId);
    this.server.to(`list:${data.listId}`).emit('item:added', item);
    return item;
  }

  @SubscribeMessage('item:update')
  async handleUpdateItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: UpdateItemDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    const { itemId, listId, ...updateData } = data;
    const item = await this.listService.updateItem(itemId, updateData);
    this.server.to(`list:${listId}`).emit('item:updated', item);
    return item;
  }

  @SubscribeMessage('item:toggle')
  async handleToggleItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: ToggleItemDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    const item = await this.listService.toggleItem(data.itemId, data.checked, client.userId);
    this.server.to(`list:${data.listId}`).emit('item:toggled', item);
    return item;
  }

  @SubscribeMessage('item:delete')
  async handleDeleteItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: ItemRefDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    await this.listService.deleteItem(data.itemId);
    this.server.to(`list:${data.listId}`).emit('item:deleted', { id: data.itemId });
  }

  // ── Gastos ───────────────────────────────────────────────────────────────────

  @SubscribeMessage('expense:add')
  async handleAddExpense(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: AddExpenseDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    const expense = await this.listService.addExpense(data.listId, client.userId, data.amount, data.description);
    this.server.to(`list:${data.listId}`).emit('expense:added', expense);
    return expense;
  }

  @SubscribeMessage('expense:delete')
  async handleDeleteExpense(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: ExpenseRefDto,
  ) {
    await this.assertListAccess(client.userId, data.listId);
    await this.listService.deleteExpense(data.expenseId);
    this.server.to(`list:${data.listId}`).emit('expense:deleted', { id: data.expenseId });
  }

  notifyExpenseTrackingChanged(listId: string, trackExpenses: boolean) {
    this.server.to(`list:${listId}`).emit('list:expenses-toggled', { id: listId, trackExpenses });
  }

  notifyListSettled(listId: string) {
    this.server.to(`list:${listId}`).emit('list:settled', { id: listId });
  }
}
