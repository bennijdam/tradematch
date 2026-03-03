export default function MessageInbox() {
  const threads = [
    'Builder confirmed site visit for Friday',
    'Electrician asked for access details',
    'Quote comparison update is ready',
  ];

  return (
    <section id="messages" className="panel">
      <h2 style={{ marginTop: 0 }}>Inbox</h2>
      <ul>
        {threads.map((thread) => (
          <li key={thread}>{thread}</li>
        ))}
      </ul>
    </section>
  );
}
