import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_URL, } from './config';
import { TOKEN_KEY } from './api';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (!socket) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    socket = io(API_URL, {
      autoConnect: true,
      auth: token ? { token } : {},
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
