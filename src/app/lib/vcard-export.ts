import { db, Person } from './db';
import { toast } from 'sonner';

export async function exportPersonToVCard(personId: number) {
  const person = await db.people.get(personId);
  if (!person) {
    toast.error('Person not found');
    return;
  }

  const vCardData = generateVCard(person);
  downloadVCard(vCardData, person.name);
}

export async function exportAllPeopleToVCards() {
  const people = await db.people.toArray();
  
  if (people.length === 0) {
    toast.error('No contacts to export');
    return;
  }

  // Create a combined vCard file with all contacts
  const allVCards = people.map(person => generateVCard(person)).join('\n');
  
  const blob = new Blob([allVCards], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pocketnetwork-contacts-${new Date().toISOString().split('T')[0]}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success(`Exported ${people.length} contact${people.length !== 1 ? 's' : ''}`);
}

function generateVCard(person: Person): string {
  const lines: string[] = [];
  
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  
  // Name
  const nameParts = person.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  lines.push(`N:${lastName};${firstName};;;`);
  lines.push(`FN:${person.name}`);
  
  // Organization
  if (person.company) {
    lines.push(`ORG:${person.company}`);
  }
  
  // Title/Role
  if (person.role) {
    lines.push(`TITLE:${person.role}`);
  }
  
  // Email
  if (person.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${person.email}`);
  }
  
  // Phone
  if (person.phone) {
    lines.push(`TEL;TYPE=CELL:${person.phone}`);
  }
  
  // LinkedIn URL
  if (person.linkedInUrl) {
    lines.push(`URL:${person.linkedInUrl}`);
  }
  
  // Notes
  if (person.notes) {
    // Escape special characters in notes
    const escapedNotes = person.notes
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
    lines.push(`NOTE:${escapedNotes}`);
  }
  
  // Photo (if available and it's a data URL)
  if (person.photoUrl && person.photoUrl.startsWith('data:image')) {
    // Extract the base64 data
    const photoData = person.photoUrl.split(',')[1];
    if (photoData) {
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoData}`);
    }
  }
  
  lines.push('END:VCARD');
  
  return lines.join('\r\n');
}

function downloadVCard(vCardData: string, fileName: string) {
  const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\s/g, '-')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success('vCard downloaded');
}
