import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TicketMessageDocument } from './schemas/ticket-message.schema';

@WebSocketGateway({
  namespace: 'tickets',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
})
export class TicketsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    // Gateway lifecycle hook for future telemetry/logging if needed.
  }

  @SubscribeMessage('ticket:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId?: string },
  ) {
    if (!payload?.ticketId) {
      return { ok: false, error: 'ticketId is required' };
    }

    client.join(this.roomName(payload.ticketId));
    return { ok: true, ticketId: payload.ticketId };
  }

  @SubscribeMessage('ticket:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId?: string },
  ) {
    if (!payload?.ticketId) {
      return { ok: false, error: 'ticketId is required' };
    }

    client.leave(this.roomName(payload.ticketId));
    return { ok: true, ticketId: payload.ticketId };
  }

  emitTicketMessageCreated(ticketId: string, message: TicketMessageDocument) {
    console.log('[Gateway] Emitting ticket:message.created', {
      ticketId,
      senderRole: message.senderRole,
      senderName: message.senderName,
      message: message.message,
      type: message.type,
      meetingLink: message.meetingLink,
      timestamp: message.timestamp,
      createdAt: message.createdAt,
    });
    this.server.to(this.roomName(ticketId)).emit('ticket:message.created', {
      id: message._id,
      ticketId,
      senderRole: message.senderRole,
      senderName: message.senderName,
      message: message.message,
      type: message.type,
      meetingLink: message.meetingLink,
      screenshots: message.screenshots ?? [],
      timestamp: message.timestamp,
      createdAt: message.createdAt,
    });
  }

  private roomName(ticketId: string): string {
    return `ticket:${ticketId}`;
  }
}
