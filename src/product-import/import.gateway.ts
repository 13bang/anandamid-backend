import {
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*'
  }
})
export class ImportGateway {

  @WebSocketServer()
  server: Server;

  sendProgress(progress: number) {
    this.server.emit('import-progress', progress);
  }

}