import { Email } from '../features/mailbox/store/emailStore';

const senders = [
  { name: 'John Smith', email: 'john.smith@example.com' },
  { name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.com' },
  { name: 'Michael Brown', email: 'mbrown@startup.io' },
  { name: 'Emily Davis', email: 'emily.davis@university.edu' },
  { name: 'David Wilson', email: 'david.w@consulting.com' },
  { name: 'Lisa Anderson', email: 'l.anderson@agency.com' },
  { name: 'James Martinez', email: 'james@freelance.net' },
  { name: 'Jennifer Taylor', email: 'j.taylor@enterprise.com' },
  { name: 'Robert Thomas', email: 'robert.thomas@foundation.org' },
  { name: 'Mary Garcia', email: 'mgarcia@solutions.com' },
];

const subjects = [
  'Quarterly Report Review',
  'Meeting Schedule for Next Week',
  'Project Proposal Feedback',
  'Important: System Maintenance',
  'Your Order Has Been Shipped',
  'New Feature Release Announcement',
  'Invoice #12345 - Payment Due',
  'Team Building Event This Friday',
  'Newsletter: Industry Trends',
  'Re: Budget Approval Request',
  'Action Required: Password Reset',
  'Invitation to Join Our Webinar',
  'Customer Feedback Summary',
  'Weekly Performance Metrics',
  'Contract Review Needed',
  'Holiday Office Hours',
  'New Job Opportunity',
  'Security Alert: Unusual Activity',
  'Congratulations on Your Achievement!',
  'Survey: Help Us Improve',
];

const bodyTemplates = [
  'Thank you for your continued collaboration. I wanted to follow up on our previous discussion regarding the upcoming project. Please review the attached documents at your earliest convenience.',
  'I hope this email finds you well. I am writing to inform you about the latest developments in our department. We have made significant progress and would like to share the results with you.',
  'Following our meeting yesterday, I have compiled a list of action items that need to be addressed. Please let me know if you have any questions or concerns about the timeline.',
  'This is a friendly reminder about the upcoming deadline. Please ensure all materials are submitted by the end of this week to avoid any delays in processing.',
  'I wanted to reach out and thank you for your excellent work on the recent campaign. Your dedication and creativity have been instrumental in achieving our goals.',
  'As discussed in our previous conversation, I am sending over the requested information. Please review and provide your feedback at your earliest convenience.',
  'I hope you had a great weekend. I am writing to schedule a follow-up meeting to discuss the next phase of our project. Are you available sometime next week?',
  'Thank you for bringing this matter to my attention. I have reviewed the details and would like to propose a solution. Please let me know if this works for you.',
  'I am pleased to inform you that your request has been approved. The next steps are outlined below. Please do not hesitate to reach out if you need any assistance.',
  'I wanted to share some exciting news with you. We have reached a major milestone and I believe this will have a positive impact on our future initiatives.',
];

const generateEmails = (): Email[] => {
  const emails: Email[] = [];
  const now = new Date();

  for (let i = 0; i < 60; i++) {
    const sender = senders[Math.floor(Math.random() * senders.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const body =
      bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)];

    // Distribute emails across mailboxes
    let mailboxId = 'inbox';
    if (i < 35) mailboxId = 'inbox';
    else if (i < 40) mailboxId = 'sent';
    else if (i < 45) mailboxId = 'drafts';
    else if (i < 50) mailboxId = 'archive';
    else if (i < 55) mailboxId = 'trash';
    else mailboxId = 'spam';

    const timestamp = new Date(now.getTime() - i * 3600000 * 2); // 2 hours apart

    const email: Email = {
      id: `email-${i + 1}`,
      from: sender,
      to: [{ name: 'Me', email: 'me@mycompany.com' }],
      subject: subject,
      preview: body.substring(0, 80) + '...',
      body: `<p>${body}</p><p><br></p><p>${body}</p>`,
      timestamp: timestamp.toISOString(),
      isRead: Math.random() > 0.4,
      isStarred: Math.random() > 0.9,
      mailboxId: mailboxId,
      attachments:
        Math.random() > 0.7
          ? [
              {
                id: `attachment-${i}-1`,
                name: 'document.pdf',
                size: 245678,
                type: 'application/pdf',
              },
              ...(Math.random() > 0.5
                ? [
                    {
                      id: `attachment-${i}-2`,
                      name: 'image.jpg',
                      size: 123456,
                      type: 'image/jpeg',
                    },
                  ]
                : []),
            ]
          : undefined,
    };

    if (Math.random() > 0.8) {
      email.cc = [{ name: 'Team Lead', email: 'team.lead@mycompany.com' }];
    }

    emails.push(email);
  }

  return emails;
};

export const emails = generateEmails();
