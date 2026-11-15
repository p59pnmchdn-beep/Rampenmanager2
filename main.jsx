import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, LogOut, Plus, Trash2, Users, Truck, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && anon ? createClient(url, anon) : null;
const RAMPS = [1, 2, 3];
const TIMES = Array.from({ length: 12 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
const toLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => toLocalDate(new Date());
const lastBookableDate = () => { const d = new Date(); d.setDate(d.getDate() + 14); return toLocalDate(d); };

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [date, setDate] = useState(today());
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('calendar');
  const [form, setForm] = useState({ ramp: 1, time: '06:00', company: '', plate: '', partner: '', note: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupMissing, setSetupMissing] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadProfile(); else { setProfile(null); setBookings([]); } }, [session]);
  useEffect(() => { if (session && profile) loadBookings(); }, [session, profile, date]);

  async function loadProfile() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).single();
    if (error) { setMessage('Benutzerprofil konnte nicht geladen werden. Bitte Administrator kontaktieren.'); return; }
    setProfile(data);
  }
  async function loadBookings() {
    const { data, error } = await supabase.from('bookings').select('*').eq('booking_date', date).order('start_time');
    if (error) setMessage(error.message); else setBookings(data || []);
  }
  async function login(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage('Anmeldung fehlgeschlagen: E-Mail oder Passwort prüfen.');
    setBusy(false);
  }
  async function logout() { await supabase.auth.signOut(); setProfile(null); }
  async function createBooking(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const start = `${form.time}:00`;
    const endHour = Number(form.time.slice(0,2)) + 1;
    const end = `${String(endHour).padStart(2,'0')}:00:00`;
    const { error } = await supabase.from('bookings').insert({
      ramp_number: Number(form.ramp), booking_date: date, start_time: start, end_time: end,
      company: form.company.trim(), truck_plate: form.plate.trim(), partner: form.partner.trim(), note: form.note.trim(), created_by: session.user.id
    });
    if (error) setMessage(error.code === '23505' ? 'Dieses Zeitfenster auf dieser Rampe ist bereits vergeben.' : error.message);
    else { setMessage('Buchung erfolgreich gespeichert.'); setForm({ ramp: 1, time: '06:00', company: '', plate: '', partner: '', note: '' }); await loadBookings(); }
    setBusy(false);
  }
  async function deleteBooking(id) {
    if (!confirm('Diese Buchung wirklich stornieren?')) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) setMessage(error.message); else { setMessage('Buchung storniert.'); await loadBookings(); }
  }
  async function addUser(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const { data: { session: current } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: newUser, headers: { Authorization: `Bearer ${current.access_token}` } });
    if (error || data?.error) setMessage(data?.error || error.message || 'Benutzer konnte nicht angelegt werden.');
    else { setMessage(`Benutzer ${newUser.email} wurde angelegt.`); setNewUser({ name: '', email: '', password: '' }); }
    setBusy(false);
  }

  if (setupMissing) return <Setup />;
  if (!session) return <main className="login-wrap"><section className="login-card"><div className="brand-mark"><Truck size={26}/></div><p className="eyebrow">LOGISTIK · RAMPE</p><h1>Rampenbuchung</h1><p className="muted">Melde dich mit deinem persönlichen Zugang an.</p><form onSubmit={login} className="stack"><label>E-Mail-Adresse<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="name@firma.at"/></label><label>Passwort<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Passwort"/></label><button className="primary" disabled={busy}>{busy?'Anmeldung…':'Anmelden'}</button></form>{message&&<p className="message">{message}</p>}<p className="tiny muted">Zugänge werden ausschließlich vom Administrator erstellt.</p></section></main>;

  if (!profile) return <main className="loading">Benutzerprofil wird geladen…</main>;
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark small"><Truck size={20}/></div><div><strong>Rampenbuchung</strong><span>3 Verladerampen</span></div></div><div className="user-area"><span className="user-chip"><span className="avatar">{(profile.full_name || session.user.email).slice(0,1).toUpperCase()}</span><span>{profile.full_name || session.user.email}<small>{profile.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}</small></span></span><button className="icon-button" onClick={logout} title="Abmelden"><LogOut size={18}/></button></div></header>
    <main className="content"><div className="page-heading"><div><p className="eyebrow">ÜBERSICHT</p><h1>Rampenplan</h1><p className="muted">Verfügbarkeit und Buchungen auf einen Blick.</p></div><button className="secondary" onClick={loadBookings}><RefreshCw size={16}/> Aktualisieren</button></div>
      <div className="toolbar"><label className="date-field"><CalendarDays size={17}/><input type="date" min={today()} max={lastBookableDate()} value={date} onChange={e=>setDate(e.target.value)}/></label><div className="legend"><span><i className="dot free"/> Frei</span><span><i className="dot booked"/> Gebucht</span></div></div>
      <section className="ramp-grid">{RAMPS.map(r => { const count = bookings.filter(b=>b.ramp_number===r).length; return <article className="ramp-summary" key={r}><div className="ramp-icon"><Truck size={19}/></div><div><span>RAMPE {r}</span><strong>{count} <small>/ 12 Zeitfenster</small></strong></div><span className="summary-dot"/></article>; })}</section>
      <section className="panel"><div className="panel-title"><div><h2><CalendarDays size={19}/> Tagesbelegung</h2><p className="muted">06:00 bis 18:00 Uhr · 60-Minuten-Fenster</p></div></div><div className="table-scroll"><table className="schedule"><thead><tr><th>Uhrzeit</th>{RAMPS.map(r=><th key={r}>Rampe {r}</th>)}</tr></thead><tbody>{TIMES.map(t=><tr key={t}><th>{t}</th>{RAMPS.map(r=>{const b=bookings.find(x=>x.ramp_number===r&&x.start_time.slice(0,5)===t);return <td key={r}>{b?<div className="booking-cell"><strong>{b.company}</strong><span>{b.truck_plate}</span><small>{b.partner || '—'}</small>{(profile.role==='admin'||b.created_by===session.user.id)&&<button className="delete-link" onClick={()=>deleteBooking(b.id)}><Trash2 size={12}/> Stornieren</button>}</div>:<span className="free-cell">Frei</span>}</td>})}</tr>)}</tbody></table></div></section>
      <div className="lower-grid"><section className="panel"><div className="panel-title"><div><h2><Plus size={19}/> Neue Buchung</h2><p className="muted">Reserviere ein freies Zeitfenster. Buchungen sind maximal 14 Tage im Voraus möglich.</p></div></div><form className="stack" onSubmit={createBooking}><div className="form-row"><label>Rampe<select value={form.ramp} onChange={e=>setForm({...form,ramp:e.target.value})}>{RAMPS.map(r=><option value={r} key={r}>Rampe {r}</option>)}</select></label><label>Uhrzeit<select value={form.time} onChange={e=>setForm({...form,time:e.target.value})}>{TIMES.map(t=><option value={t} key={t}>{t}–{String(Number(t.slice(0,2))+1).padStart(2,'0')}:00</option>)}</select></label></div><label>Firma<input required value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Firmenname"/></label><label>LKW-Kennzeichen<input required value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})} placeholder="z. B. GD-123AB"/></label><label>Lieferant / Kunde<input value={form.partner} onChange={e=>setForm({...form,partner:e.target.value})} placeholder="Name"/></label><label>Bemerkung <span className="optional">optional</span><textarea rows="2" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Zusätzliche Informationen"/></label><button className="primary" disabled={busy}><Plus size={17}/> Buchung speichern</button></form></section>
      <section className="panel"><div className="panel-title"><div><h2><Clock size={19}/> Buchungen heute</h2><p className="muted">Alle Reservierungen für den gewählten Tag.</p></div><span className="count-pill">{bookings.length}</span></div>{bookings.length===0?<div className="empty">Noch keine Buchungen für diesen Tag.</div>:<div className="booking-list">{bookings.map(b=><div className="booking-row" key={b.id}><div className="time-block">{b.start_time.slice(0,5)}<small>Rampe {b.ramp_number}</small></div><div className="booking-info"><strong>{b.company}</strong><span>{b.truck_plate} · {b.partner||'Kein Kunde angegeben'}</span></div>{(profile.role==='admin'||b.created_by===session.user.id)&&<button className="icon-button danger" onClick={()=>deleteBooking(b.id)}><Trash2 size={16}/></button>}</div>)}</div>}</section></div>
      {profile.role==='admin'&&<section className="panel admin-panel"><div className="panel-title"><div><h2><Users size={19}/> Mitarbeiter verwalten</h2><p className="muted">Nur Administratoren können neue Zugänge erstellen.</p></div><span className="admin-label"><ShieldCheck size={14}/> ADMIN</span></div><form className="user-form" onSubmit={addUser}><label>Name<input required value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="Vor- und Nachname"/></label><label>E-Mail-Adresse<input required type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="mitarbeiter@firma.at"/></label><label>Startpasswort<input required minLength="8" type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} placeholder="Mindestens 8 Zeichen"/></label><button className="primary" disabled={busy}><Plus size={16}/> Mitarbeiter anlegen</button></form><p className="tiny muted">Gib dem Mitarbeiter seine Zugangsdaten persönlich weiter. Er kann sich damit direkt anmelden.</p></section>}
      {message&&<div className="toast" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}
      <footer>Rampenbuchung · Interne Betriebsanwendung</footer>
    </main>
  </div>;
}

function Setup(){return <main className="setup-wrap"><section className="setup-card"><div className="brand-mark"><Truck size={26}/></div><p className="eyebrow">ERSTEINRICHTUNG</p><h1>Fast startklar.</h1><p>Die Oberfläche ist vorbereitet. Verbinde jetzt dein Supabase-Projekt, damit Benutzerkonten und Buchungen zentral gespeichert werden.</p><ol><li>Lege ein Supabase-Projekt an.</li><li>Führe <code>supabase/schema.sql</code> im SQL Editor aus.</li><li>Trage Projekt-URL und Anon-Key in <code>.env</code> ein.</li><li>Deploye die Edge Function und erstelle den ersten Administrator (Anleitung in README).</li></ol><p className="tiny muted">Die Zugangsdaten werden nicht in dieser Website gespeichert, sondern sicher über Supabase verwaltet.</p></section></main>}

createRoot(document.getElementById('root')).render(<App/>);
