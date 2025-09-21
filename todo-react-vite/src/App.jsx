import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'todo-items-v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDateTime = (ms) => {
  try {
    const d = new Date(ms);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(d);
  } catch { return ''; }
};
const relativeTime = (ms, now = Date.now()) => {
  try {
    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    let delta = Math.round((ms - now) / 1000);
    const abs = Math.abs(delta);
    if (abs < 60) return rtf.format(delta, 'second');
    delta = Math.round(delta / 60);
    if (Math.abs(delta) < 60) return rtf.format(delta, 'minute');
    delta = Math.round(delta / 60);
    if (Math.abs(delta) < 24) return rtf.format(delta, 'hour');
    delta = Math.round(delta / 24);
    if (Math.abs(delta) < 30) return rtf.format(delta, 'day');
    const months = Math.round(delta / 30);
    if (Math.abs(months) < 12) return rtf.format(months, 'month');
    const years = Math.round(months / 12);
    return rtf.format(years, 'year');
  } catch { return ''; }
};

function useLocalStorageList(key, initial = []) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const arr = Array.isArray(parsed) ? parsed : initial;
      return arr.map(i => {
        if (i && typeof i === 'object') {
          const createdAt = i.createdAt ?? Date.now();
          const completedAt = i.completed ? (i.completedAt ?? Date.now()) : null;
          return { ...i, createdAt, completedAt };
        }
        return i;
      });
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch {}
  }, [key, items]);
  return [items, setItems];
}

export default function App() {
  const [items, setItems] = useLocalStorageList(STORAGE_KEY, []);
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active': return items.filter(i => !i.completed);
      case 'completed': return items.filter(i => i.completed);
      default: return items;
    }
  }, [items, filter]);

  const remaining = useMemo(() => items.filter(i => !i.completed).length, [items]);
  const total = items.length;

  const addItem = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setItems(prev => [{ id: uid(), text: trimmed, completed: false, createdAt: Date.now() }, ...prev]);
  };

  const toggleItem = (id) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newCompleted = !i.completed;
      return { ...i, completed: newCompleted, completedAt: newCompleted ? Date.now() : null };
    }));
  };

  const deleteItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const editItem = (id, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (trimmed === i.text) return i;
      return { ...i, text: trimmed, editedAt: Date.now() };
    }));
  };

  const clearCompleted = () => {
    setItems(prev => prev.filter(i => !i.completed));
  };

  return (
    <main className="app" aria-labelledby="app-title">
      <h1 id="app-title">Lista de Tarefas</h1>
      <TodoForm onAdd={addItem} />
      <Toolbar filter={filter} onFilterChange={setFilter} onClearCompleted={clearCompleted} />
      <ul id="todo-list" className="todo-list" aria-live="polite" aria-relevant="additions removals">
        {filtered.map(item => (
          <TodoItem key={item.id} item={item} now={now} onToggle={toggleItem} onDelete={deleteItem} onEdit={editItem} />
        ))}
      </ul>
      <StatusBar remaining={remaining} total={total} />
    </main>
  );
}

function TodoForm({ onAdd }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    onAdd(value);
    setValue('');
    inputRef.current?.focus();
  };
  return (
    <form id="todo-form" className="todo-form" autoComplete="off" onSubmit={submit}>
      <label className="sr-only" htmlFor="todo-input">Nova tarefa</label>
      <input
        id="todo-input"
        name="todo"
        type="text"
        placeholder="Adicionar nova tarefa..."
        minLength={1}
        maxLength={200}
        required
        value={value}
        onChange={e => setValue(e.target.value)}
        ref={inputRef}
      />
      <button type="submit" className="btn primary">Adicionar</button>
    </form>
  );
}

function Toolbar({ filter, onFilterChange, onClearCompleted }) {
  const tab = (id, label) => (
    <button
      type="button"
      className={`tab ${filter === id ? 'active' : ''}`}
      data-filter={id}
      aria-selected={filter === id}
      onClick={() => onFilterChange(id)}
    >{label}</button>
  );
  return (
    <section className="toolbar" aria-label="Filtros e ações">
      <div className="filters" role="tablist" aria-label="Filtros">
        {tab('all', 'Todas')}
        {tab('active', 'Ativas')}
        {tab('completed', 'Concluídas')}
      </div>
      <div className="actions">
        <button type="button" id="clear-completed" className="btn" onClick={onClearCompleted}>Limpar concluídas</button>
      </div>
    </section>
  );
}

function TodoItem({ item, now, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setText(item.text); }, [item.text]);

  const commit = () => {
    setEditing(false);
    if (text.trim() && text.trim() !== item.text) onEdit(item.id, text);
  };
  const cancel = () => { setEditing(false); setText(item.text); };

  return (
    <li className={`todo-item${item.completed ? ' completed' : ''}`} data-id={item.id}>
      <label className="todo">
        <input
          type="checkbox"
          checked={item.completed}
          aria-label="Concluir tarefa"
          onChange={() => onToggle(item.id)}
        />
        {editing ? (
          <input
            className="text-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            aria-label="Editar tarefa"
            ref={inputRef}
          />
        ) : (
          <>
            <span className="text" title={item.text} onDoubleClick={() => setEditing(true)}>{item.text}</span>
            {(() => {
              const ts = item.completed && item.completedAt ? item.completedAt : item.createdAt;
              const label = item.completed && item.completedAt ? 'Concluída' : 'Criada';
              return ts ? (
                <>
                  <time className="meta" dateTime={new Date(ts).toISOString()} title={formatDateTime(ts)}>
                    {label} {relativeTime(ts, now)}
                  </time>
                  <span className="meta-exact" aria-hidden="true"> — {formatDateTime(ts)}</span>
                </>
              ) : null;
            })()}
            {item.editedAt ? (
              <>
                <span className="meta-sep" aria-hidden="true">•</span>
                <time className="meta" dateTime={new Date(item.editedAt).toISOString()} title={formatDateTime(item.editedAt)}>
                  Editada {relativeTime(item.editedAt, now)}
                </time>
                <span className="meta-exact" aria-hidden="true"> — {formatDateTime(item.editedAt)}</span>
              </>
            ) : null}
          </>
        )}
      </label>
      <div className="item-actions">
        <button className="btn" type="button" onClick={() => setEditing(true)}>Editar</button>
        <button className="btn danger" type="button" onClick={() => onDelete(item.id)}>Remover</button>
      </div>
    </li>
  );
}

function StatusBar({ remaining, total }) {
  return (
    <footer className="statusbar" aria-live="polite">
      <span><strong id="count-remaining">{remaining}</strong> restantes</span>
      <span>•</span>
      <span><strong id="count-total">{total}</strong> no total</span>
    </footer>
  );
}
