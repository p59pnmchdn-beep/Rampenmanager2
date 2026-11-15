# Rampenbuchung – 3 Rampen

Responsive Web-App für drei Verladerampen mit persönlichem Login, zentralem Kalender und Administrator-Funktion zum Erstellen von Mitarbeiterkonten.

## Enthalten
- Persönliche Anmeldung per E-Mail und Passwort (keine öffentliche Registrierung)
- Admin kann Mitarbeiterkonten anlegen
- Gemeinsame Tagesübersicht für Rampen 1–3
- 60-Minuten-Zeitfenster von 06:00 bis 18:00 Uhr
- Buchung nur ab heute und maximal 14 Kalendertage im Voraus (auch serverseitig in der Datenbank geprüft)
- Firma, LKW-Kennzeichen, Lieferant/Kunde und Bemerkung
- Datenbank verhindert doppelte Buchungen derselben Rampe und Startzeit
- Mitarbeiter können eigene Buchungen stornieren; Admin kann alle stornieren
- Buchungen und Benutzer werden zentral in Supabase gespeichert

## 1. Supabase-Projekt einrichten
1. Auf https://supabase.com ein kostenloses Projekt erstellen.
2. Im Projekt unter **SQL Editor** den Inhalt von `supabase/schema.sql` ausführen.
3. Unter **Authentication → Providers → Email** E-Mail/Passwort aktiv lassen.
4. Öffentliche Registrierung deaktivieren (Allow new users to sign up = OFF). Mitarbeiter werden ausschließlich über die Admin-Funktion angelegt.
5. Unter **Project Settings → API** Project URL und anon/publishable key kopieren.

## 2. Ersten Administrator anlegen
1. Im Supabase Dashboard unter **Authentication → Users → Add user** einen Benutzer mit Firmen-E-Mail und Passwort anlegen.
2. Die UUID dieses Benutzers kopieren.
3. Im SQL Editor ausführen (UUID ersetzen):

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-DES-ERSTEN-ADMIN-BENUTZERS';
```

Falls noch kein Profil erzeugt wurde, zuerst ausführen:

```sql
insert into public.profiles (id, full_name, role)
values ('UUID-DES-ERSTEN-ADMIN-BENUTZERS', 'Administrator', 'admin')
on conflict (id) do update set role = 'admin';
```

## 3. Edge Function bereitstellen
Supabase CLI installieren und im Projektverzeichnis ausführen:

```bash
supabase login
supabase link --project-ref DEINE_PROJECT_REF
supabase functions deploy admin-create-user
```

Die Function verwendet die Supabase-Projektgeheimnisse `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY`, die in Supabase Functions normalerweise automatisch verfügbar sind. Der Service-Role-Key darf niemals in die Browser-App oder in `.env` mit `VITE_`-Präfix.

## 4. Lokal starten
```bash
cp .env.example .env
# .env bearbeiten und URL + anon/publishable key eintragen
npm install
npm run dev
```

## 5. Online veröffentlichen
Die App kann z. B. über Vercel oder Netlify veröffentlicht werden. Build command: `npm run build`; output directory: `dist`. Dort dieselben zwei öffentlichen Variablen setzen:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Danach können sich Mitarbeiter mit ihren vom Administrator angelegten Zugangsdaten anmelden.

## Mobile Nutzung
- Die Oberfläche ist responsiv und kann am iPhone sowie am PC genutzt werden.
- Am iPhone in Safari die veröffentlichte Website öffnen, auf **Teilen** tippen und **Zum Home-Bildschirm** wählen.
- Mitarbeiter melden sich am PC mit ihrer persönlichen E-Mail-Adresse und ihrem Passwort an.
- Der Administrator kann dieselbe Website am iPhone öffnen und dort Mitarbeiterkonten verwalten.

## Wichtige Hinweise
- Das ist ein bereitgestellter Quellcode-Baukasten, noch keine bereits gehostete öffentliche Website. Für den Livebetrieb müssen Supabase und ein Hosting-Anbieter mit den Schritten oben verbunden werden.
- Zeitfenster sind aktuell fest auf 60 Minuten und 06:00–18:00 Uhr eingestellt. Buchungen sind ab heute bis maximal 14 Tage im Voraus möglich. Der letzte mögliche Beginn ist 17:00 Uhr.
- Das aktuelle Datenbankschema verhindert gleiche Startzeiten pro Rampe. Wenn später variable Slotlängen benötigt werden, sollte eine zusätzliche Überschneidungsprüfung auf Datenbankebene ergänzt werden.
- Für den betrieblichen Einsatz bitte ein starkes Admin-Passwort verwenden und die Supabase-Projektzugriffe auf befugte Personen beschränken.
