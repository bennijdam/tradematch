import styles from './MessageInbox.module.css';

export default function MessageInbox() {
  const threads = [
    'Builder confirmed site visit for Friday',
    'Electrician asked for access details',
    'Quote comparison update is ready',
  ];

  return (
    <section id="messages" className={styles.panel}>
      <h2 className={styles.title}>Inbox</h2>
      <ul className={styles.list}>
        {threads.map((thread) => (
          <li key={thread}>{thread}</li>
        ))}
      </ul>
    </section>
  );
}
