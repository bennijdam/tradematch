import styles from './CopilotBlock.module.css';

export default function CopilotBlock() {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon}>🤖</div>
        <div>
          <div className={styles.title}>AI Copilot</div>
          <div className={styles.sub}>Your project protection assistant</div>
        </div>
        <span className={styles.online}>Online</span>
      </div>
      <div className={styles.messages}>
        <div className={`${styles.msg} ${styles.alert}`}>🔔 Milestone 2 submission is ready for review.<div className={styles.time}>Today · 09:41 AM</div></div>
        <div className={`${styles.msg} ${styles.good}`}>✅ PLI insurance was re-verified this morning.<div className={styles.time}>Today · 08:15 AM</div></div>
        <div className={`${styles.msg} ${styles.ai}`}>💡 Timeline is 2 days ahead of schedule.<div className={styles.time}>Yesterday · 4:30 PM</div></div>
      </div>
      <div className={styles.inputArea}>
        <input className={styles.input} placeholder="Ask about your project…" readOnly />
        <button type="button" className={styles.sendBtn}>➤</button>
      </div>
    </section>
  );
}
