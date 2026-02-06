import { db } from './db';

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  const now = new Date();
  const uid = `followup-${Date.now()}-${Math.random().toString(36).substring(7)}@pocketnetwork.app`;
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PocketNetwork//Follow-up Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${event.title.replace(/\n/g, '\\n')}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
  ];

  if (event.location) {
    icsContent.push(`LOCATION:${event.location.replace(/\n/g, '\\n')}`);
  }

  icsContent.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return icsContent.join('\r\n');
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportFollowUpToCalendar(followUpId: number): Promise<void> {
  const followUp = await db.followUps.get(followUpId);
  if (!followUp) {
    throw new Error('Follow-up not found');
  }

  const person = await db.people.get(followUp.personId);
  const personName = person?.name || 'Unknown';

  // Set the reminder for the due date at 9:00 AM
  const startDate = new Date(followUp.dueDate);
  startDate.setHours(9, 0, 0, 0);
  
  // End time is 30 minutes later
  const endDate = new Date(startDate);
  endDate.setMinutes(30);

  const calendarEvent: CalendarEvent = {
    title: `Follow up: ${personName}`,
    description: followUp.description || `Follow up with ${personName}`,
    startDate,
    endDate,
    location: person?.company || undefined
  };

  const icsContent = generateICS(calendarEvent);
  const filename = `followup-${personName.replace(/\s+/g, '-').toLowerCase()}-${startDate.toISOString().split('T')[0]}.ics`;
  
  downloadICS(icsContent, filename);
}

export async function exportAllPendingFollowUps(): Promise<void> {
  const pendingFollowUps = await db.followUps
    .filter(f => !f.completed)
    .toArray();

  for (const followUp of pendingFollowUps) {
    const person = await db.people.get(followUp.personId);
    const personName = person?.name || 'Unknown';

    const startDate = new Date(followUp.dueDate);
    startDate.setHours(9, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(30);

    const calendarEvent: CalendarEvent = {
      title: `Follow up: ${personName}`,
      description: followUp.description || `Follow up with ${personName}`,
      startDate,
      endDate,
      location: person?.company || undefined
    };

    const icsContent = generateICS(calendarEvent);
    const filename = `followup-${personName.replace(/\s+/g, '-').toLowerCase()}-${startDate.toISOString().split('T')[0]}.ics`;
    
    downloadICS(icsContent, filename);
    
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

export async function exportEventToCalendar(eventId: number): Promise<void> {
  const event = await db.events.get(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const startDate = new Date(event.date);
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 2); // Default 2 hour duration

  const calendarEvent: CalendarEvent = {
    title: event.name,
    description: event.series || event.name,
    startDate,
    endDate,
    location: event.location || undefined
  };

  const icsContent = generateICS(calendarEvent);
  const filename = `event-${event.name.replace(/\s+/g, '-').toLowerCase()}-${startDate.toISOString().split('T')[0]}.ics`;
  
  downloadICS(icsContent, filename);
}