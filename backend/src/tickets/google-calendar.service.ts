import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar!: calendar_v3.Calendar;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    this.initializeCalendar();
  }

  private initializeCalendar() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      this.logger.warn(`Google Calendar credentials missing. Status: ID=${!!clientId}, Secret=${!!clientSecret}, Redirect=${!!redirectUri}, RefreshToken=${!!refreshToken}`);
      this.logger.warn('Google Meet link creation will partially fail if invoked.');
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      this.logger.error('Failed to initialize Google Calendar client:', error);
    }
  }

  async createMeetEvent(
    summary: string,
    description: string,
    attendeesEmails: string[] = []
  ): Promise<string | null> {
    if (!this.calendar) {
      this.logger.error('Google Calendar service is not initialized properly.');
      return null;
    }

    const event: calendar_v3.Schema$Event = {
      summary: summary,
      description: description,
      start: {
        dateTime: new Date().toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      },
      attendees: attendeesEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      return response.data.hangoutLink || null;
    } catch (error) {
      this.logger.error('Error creating Google Calendar event for Meet Link:', error);
      return null;
    }
  }
}
