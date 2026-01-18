import React from 'react';
import { header, title, content, card, actionRow, actionButton } from './styles/app.css';

export default function App(): React.JSX.Element {
  return (
    <>
      <header className={header}>
        <h1 className={title}>Text RPG</h1>
      </header>
      <main className={content}>
        <section className={card} aria-label="story">
          여행자는 어두운 숲 가장자리에 서 있습니다. 어디로 갈까요?
        </section>
        <nav className={actionRow} aria-label="actions">
          <button className={actionButton}>숲으로 들어간다</button>
          <button className={actionButton} aria-disabled="true">마을로 돌아간다</button>
        </nav>
      </main>
    </>
  );
}


