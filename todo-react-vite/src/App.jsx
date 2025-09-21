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
  const [calMonth, setCalMonth] = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let arr = items;
    switch (filter) {
      case 'active': arr = arr.filter(i => !i.completed); break;
      case 'completed': arr = arr.filter(i => i.completed); break;
      default: break;
    }
    if (selectedDate) {
      const start = new Date(selectedDate); start.setHours(0,0,0,0);
      const s = start.getTime(); const e = s + 86400000 - 1;
      arr = arr.filter(i => i.dueAt && i.dueAt >= s && i.dueAt <= e);
    }
    return arr;
  }, [items, filter, selectedDate]);

  const remaining = useMemo(() => items.filter(i => !i.completed).length, [items]);
  const total = items.length;

  const addItem = (text, dueAt) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setItems(prev => [{ id: uid(), text: trimmed, completed: false, createdAt: Date.now(), dueAt: dueAt ?? null }, ...prev]);
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
      <Calendar items={items} month={calMonth} onMonthChange={setCalMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} now={now} />
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

function Calendar({ items, month, onMonthChange, selectedDate, onSelectDate, now }) {
  const monthsFmt = React.useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }), []);
  const weekdayFmt = React.useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }), []);
  const startOfDay = (msOrDate) => { const d = new Date(msOrDate); d.setHours(0,0,0,0); return d.getTime(); };
  const addMonths = (date, n) => { const d = new Date(date); d.setDate(1); d.setMonth(d.getMonth()+n); return d; };

  const firstDay = React.useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const firstWeekday = firstDay.getDay();
  const gridStart = React.useMemo(() => { const g=new Date(firstDay); g.setDate(firstDay.getDate()-firstWeekday); return g; }, [firstDay, firstWeekday]);
  const days = React.useMemo(() => Array.from({length:42}, (_,i) => { const d=new Date(gridStart); d.setDate(gridStart.getDate()+i); return d; }), [gridStart]);

  const counts = React.useMemo(() => {
    const m = new Map();
    for (const it of items) {
      if (!it?.dueAt || it.completed) continue;
      const k = startOfDay(it.dueAt);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [items]);

  const title = monthsFmt.format(firstDay);
  const weekdays = React.useMemo(() => Array.from({length:7}, (_,i) => weekdayFmt.format(new Date(2021,7,1+i))), [weekdayFmt]);
  const selected = selectedDate ? startOfDay(selectedDate) : null;

  return (
    <section className="calendar" aria-label="Calendário mensal">
      <div className="cal-header">
        <div className="cal-title">{title.charAt(0).toUpperCase()+title.slice(1)}</div>
        <div className="cal-nav">
          <button className="btn" type="button" onClick={() => onMonthChange(addMonths(month, -1))}>◀</button>
          <button className="btn" type="button" onClick={() => { const d=new Date(); d.setDate(1); onMonthChange(d); onSelectDate(startOfDay(now)); }}>Hoje</button>
          <button className="btn" type="button" onClick={() => onMonthChange(addMonths(month, 1))}>▶</button>
        </div>
      </div>
      <div className="cal-grid">
        {weekdays.map((w,idx) => (<div key={`w-${idx}`} className="cal-weekday">{w}</div>))}
        {days.map((d,idx) => {
          const inMonth = d.getMonth() === firstDay.getMonth();
          const key = startOfDay(d);
          const count = counts.get(key) || 0;
          const overdue = count>0 && key < startOfDay(now);
          const sel = selected != null && key === selected;
          return (
            <div key={idx} className={`cal-cell${inMonth?'':' out'}${sel?' selected':''}`} onClick={() => onSelectDate(sel ? null : key)}>
              <div className="day">{d.getDate()}</div>
              <div className={`count${overdue?' overdue':''}`}>{count ? `${count} pend.` : ''}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TodoForm({ onAdd }) {
  const [value, setValue] = useState('');
  const [due, setDue] = useState('');
  const inputRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    const dueAt = due ? new Date(`${due}T00:00:00`).getTime() : null;
    onAdd(value, Number.isNaN(dueAt) ? null : dueAt);
    setValue('');
    setDue('');
    if (inputRef.current) inputRef.current.focus();
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
      <label className="sr-only" htmlFor="todo-due">Data de vencimento</label>
      <input
        id="todo-due"
        name="due"
        type="date"
        value={due}
        onChange={e => setDue(e.target.value)}
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
            {item.dueAt ? (
              <>
                <span className="meta-sep" aria-hidden="true">•</span>
                {(() => {
                  const overdue = !item.completed && item.dueAt < now;
                  const prefix = overdue ? 'Vencida' : 'Vence';
                  return (
                    <>
                      <time className={`meta due${overdue ? ' overdue' : ''}`} dateTime={new Date(item.dueAt).toISOString()} title={formatDateTime(item.dueAt)}>
                        {prefix} {relativeTime(item.dueAt, now)}
                      </time>
                      <span className="meta-exact" aria-hidden="true"> — {formatDateTime(item.dueAt)}</span>
                    </>
                  );
                })()}
              </>
            ) : null}
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
