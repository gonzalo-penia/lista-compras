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

  @SubscribeMessage('list:join')
  handleJoinList(@ConnectedSocket() client: AuthSocket, @MessageBody() listId: string) {
    client.join(`list:${listId}`);
  }

  @SubscribeMessage('list:leave')
  handleLeaveList(@ConnectedSocket() client: AuthSocket, @MessageBody() listId: string) {
    client.leave(`list:${listId}`);
  }

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
}
