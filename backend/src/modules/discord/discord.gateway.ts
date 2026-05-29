import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DiscordMessage } from './schemas/discord-message.schema';

/**
 * WebSocket gateway for real-time Discord ticket updates.
 *
 * Namespace:    /discord
 * Room pattern: discord:ticket:{ticketNumber}
 *
 * ── Client → Server ──────────────────────────────────────────────────────────
 *   ticket:join   { ticketNumber }  — subscribe to a specific ticket's messages
 *   ticket:leave  { ticketNumber }  — unsubscribe
 *
 * ── Server → Client (room-based) ─────────────────────────────────────────────
 *   new_message       { ticketNumber, message }     — new live message
 *   transcript_ready  { ticketNumber, messageCount }— transcript ingested
 *
 * ── Server → ALL clients (global) ────────────────────────────────────────────
 *   discord_activity  { ticketNumber, event }       — any ticket activity
 *     events: 'new_message' | 'transcript_ready' | 'ticket_created'
 *
 *   The global discord_activity event lets the list view refresh message
 *   counts and status badges without being joined to a specific room.
 */
@WebSocketGateway({
  namespace: '/discord',
  cors: { origin: '*', credentials: true },
})
export class DiscordGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(DiscordGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`[Discord WS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`[Discord WS] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ticket:join')
  handleJoin(
    @MessageBody() payload: { ticketNumber: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = this.roomName(payload.ticketNumber);
    void client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('ticket:leave')
  handleLeave(
    @MessageBody() payload: { ticketNumber: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = this.roomName(payload.ticketNumber);
    void client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
  }

  // ── Outbound emitters called by DiscordService ─────────────────────────────

  /** Emit to the room (clients watching this specific ticket's detail view). */
  emitNewMessage(ticketNumber: string, message: DiscordMessage): void {
    const room = this.roomName(ticketNumber);
    this.server.to(room).emit('new_message', { ticketNumber, message });
    this.logger.debug(`Emitted new_message → room ${room}`);
  }

  /** Emit to the room (clients watching this ticket's detail view). */
  emitTranscriptReady(ticketNumber: string, messageCount: number): void {
    const room = this.roomName(ticketNumber);
    this.server
      .to(room)
      .emit('transcript_ready', { ticketNumber, messageCount });
    this.logger.log(
      `Emitted transcript_ready for ticket #${ticketNumber} (${messageCount} messages)`,
    );
  }

  /**
   * Broadcast to ALL connected clients so the list view can refresh counts
   * and status badges without being in any specific room.
   *
   * Called for: new_message, transcript_ready, ticket_created
   */
  emitActivity(
    ticketNumber: string,
    event: 'new_message' | 'transcript_ready' | 'ticket_created' | 'ticket_closed',
  ): void {
    this.server.emit('discord_activity', { ticketNumber, event });
    this.logger.debug(`Emitted discord_activity [${event}] for ticket #${ticketNumber}`);
  }

  private roomName(ticketNumber: string): string {
    return `discord:ticket:${ticketNumber}`;
  }
}
