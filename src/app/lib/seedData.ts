import { db } from './db';
import { subDays, addDays } from 'date-fns';

export async function seedSampleData() {
  // Check if data already exists
  const existingPeople = await db.people.count();
  if (existingPeople > 0) {
    return; // Don't seed if there's already data
  }

  const now = new Date();

  // Seed Events
  const event1Id = await db.events.add({
    name: 'Tech Meetup Sydney',
    date: subDays(now, 7),
    location: 'WeWork Sydney',
    notes: 'Monthly tech networking event',
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 7)
  });

  const event2Id = await db.events.add({
    name: 'Coffee Chats',
    date: subDays(now, 3),
    location: 'Various cafes',
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 3)
  });

  // Seed People
  const person1Id = await db.people.add({
    name: 'Sarah Chen',
    company: 'StartupCo',
    role: 'Product Manager',
    notes: 'Working on AI/ML products',
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 7)
  });

  const person2Id = await db.people.add({
    name: 'Alex Kumar',
    company: 'TechVentures',
    role: 'Software Engineer',
    notes: 'Loves React and TypeScript',
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 3)
  });

  const person3Id = await db.people.add({
    name: 'Jordan Lee',
    company: 'DesignHub',
    role: 'UX Designer',
    notes: 'Specializes in accessibility',
    createdAt: subDays(now, 5),
    updatedAt: subDays(now, 5)
  });

  // Seed Meets
  const meet1Id = await db.meets.add({
    personId: person1Id,
    eventId: event1Id,
    where: 'WeWork Sydney',
    when: subDays(now, 7),
    context: 'Discussed AI product strategy and potential collaboration on a project',
    nextStep: 'Send her the article about ML best practices',
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 7)
  });

  const meet2Id = await db.meets.add({
    personId: person2Id,
    eventId: event2Id,
    where: 'Grounds Cafe',
    when: subDays(now, 3),
    context: 'Talked about React patterns and state management',
    nextStep: 'Schedule a follow-up to discuss code review practices',
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 3)
  });

  await db.meets.add({
    personId: person3Id,
    where: 'Video call',
    when: subDays(now, 5),
    context: 'Reviewed our app design for accessibility improvements',
    nextStep: 'Implement the color contrast suggestions',
    createdAt: subDays(now, 5),
    updatedAt: subDays(now, 5)
  });

  // Seed Follow-ups
  await db.followUps.add({
    meetId: meet1Id,
    personId: person1Id,
    description: 'Send Sarah the article about ML best practices',
    dueDate: addDays(now, 1),
    priority: 'medium',
    completed: false,
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 7)
  });

  await db.followUps.add({
    meetId: meet2Id,
    personId: person2Id,
    description: 'Schedule follow-up with Alex about code reviews',
    dueDate: addDays(now, 3),
    priority: 'low',
    completed: false,
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 3)
  });

  // Seed Promises
  await db.promises.add({
    personId: person3Id,
    description: 'Implement color contrast improvements Jordan suggested',
    dueDate: addDays(now, 7),
    completed: false,
    createdAt: subDays(now, 5)
  });

  // Seed Inbox Dump
  await db.inboxDumps.add({
    content: 'Met someone interesting at the coffee shop - Taylor, works at BigTech, talked about open source. Get their LinkedIn?',
    type: 'text',
    processed: false,
    createdAt: subDays(now, 1)
  });

  console.log('✅ Sample data seeded successfully');
}
