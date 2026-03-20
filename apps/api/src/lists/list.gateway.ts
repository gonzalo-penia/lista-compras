import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ListService, AddItemData, UpdateItemData } from './list.service';

interface AuthSocket extends Socket {
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ListGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly listService: ListService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: AuthSocket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  // ── Sala de familia ──────────────────────────────────────────────────────────

  @SubscribeMessage('family:join')
  handleJoinFamily(@ConnectedSocket() client: AuthSocket, @MessageBody() familyId: string) {
    client.join(`family:${familyId}`);
  }

  @SubscribeMessage('family:leave')
  handleLeaveFamily(@ConnectedSocket() client: AuthSocket, @MessageBody() familyId: string) {
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
  handleJoinList(@ConnectedSocket() client: AuthSocket, @MessageBody() listId: string) {
    client.join(`list:${listId}`);
  }

  @SubscribeMessage('list:leave')
  handleLeaveList(@ConnectedSocket() client: AuthSocket, @MessageBody() listId: string) {
    client.leave(`list:${listId}`);
  }

  // ── Ítems ────────────────────────────────────────────────────────────────────

  @SubscribeMessage('item:add')
  async handleAddItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: AddItemData & { listId: string },
  ) {
    const item = await this.listService.addItem(data.listId, data, client.userId);
    this.server.to(`list:${data.listId}`).emit('item:added', item);
    return item;
  }

  @SubscribeMessage('item:update')
  async handleUpdateItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: UpdateItemData & { itemId: string; listId: string },
  ) {
    const { itemId, listId, ...updateData } = data;
    const item = await this.listService.updateItem(itemId, updateData);
    this.server.to(`list:${listId}`).emit('item:updated', item);
    return item;
  }

  @SubscribeMessage('item:toggle')
  async handleToggleItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { itemId: string; listId: string; checked: boolean },
  ) {
    const item = await this.listService.toggleItem(data.itemId, data.checked, client.userId);
    this.server.to(`list:${data.listId}`).emit('item:toggled', item);
    return item;
  }

  @SubscribeMessage('item:delete')
  async handleDeleteItem(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { itemId: string; listId: string },
  ) {
    await this.listService.deleteItem(data.itemId);
    this.server.to(`list:${data.listId}`).emit('item:deleted', { id: data.itemId });
  }

  // ── Gastos ───────────────────────────────────────────────────────────────────

  @SubscribeMessage('expense:add')
  async handleAddExpense(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { listId: string; amount: number; description?: string },
  ) {
    const expense = await this.listService.addExpense(data.listId, client.userId, data.amount, data.description);
    this.server.to(`list:${data.listId}`).emit('expense:added', expense);
    return expense;
  }

  @SubscribeMessage('expense:delete')
  async handleDeleteExpense(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { expenseId: string; listId: string },
  ) {
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
