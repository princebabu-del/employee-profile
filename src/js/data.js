// Sample data for the Users page. Replace this with a real API call
// once a backend is available — keep the same row shape so main.js doesn't change.

const FIRST_NAMES = ['Bob','Ernie','Nicolas','Walt','Ben','Patrick','Caleb','Liam','Jeff','Jim','Aaron','Adam','Andrew','Anthony','Brian','Carlos','Charles','Chris','Daniel','David','Dennis','Edward','Eric','Frank','Gary','George','Greg','Henry','Ivan','Jack','James','Jason','John','Joseph','Justin','Keith','Kevin','Larry','Mark','Martin','Matthew','Michael','Neil','Oscar','Paul','Peter','Philip','Ralph','Raymond','Richard','Robert','Roger','Ronald','Samuel','Scott','Sean','Stephen','Steven','Thomas','Timothy','Tony','Victor','Vincent','Walter','William'];
const LAST_NAMES = ['Anderson','Martinez','Thompson','Garcia','Williams','Davis','Rodriguez','Wilson','Taylor','Johnson','Brown','Jones','Miller','Moore','Jackson','White','Harris','Martin','Lewis','Lee','Walker','Hall','Allen','Young','King','Wright','Scott','Green','Baker','Adams','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson'];
const ROLES = ['Worker','Worker','Worker','Worker','Foreman','Supervisor','Admin'];
const TITLES = ['Laborer','Laborer','Laborer','Carpenter','Electrician','Plumber','Welder','Painter','Roofer'];
const DEPTS = ['','','','Operations','Construction','Field Ops','Electrical'];
const BRANCHES = ['','','Main','East','West','North','South'];
const STATUSES = ['Enabled','Enabled','Enabled','Enabled','Enabled','Pending','Disabled'];
const AVATAR_COLORS = ['#7026b9','#17b26a','#2970ff','#f79009','#f04438','#0ea5e9','#a855f7','#ec4899','#0d9488','#6366f1','#84cc16','#eab308'];

const ADDRESSES = [
  { street: '186 Hopson Road',     city: 'Norwich',     state: 'VT', zip: '05055' },
  { street: '42 Maple Avenue',     city: 'Portland',    state: 'OR', zip: '97201' },
  { street: '918 Elm Street',      city: 'Sacramento',  state: 'CA', zip: '95814' },
  { street: '7 Pine Court',        city: 'Seattle',     state: 'WA', zip: '98101' },
  { street: '350 Oak Drive',       city: 'Denver',      state: 'CO', zip: '80201' },
  { street: '23 Birch Lane',       city: 'Phoenix',     state: 'AZ', zip: '85001' },
  { street: '1100 Cedar Blvd',     city: 'Austin',      state: 'TX', zip: '78701' },
];
const WORKPLACES_DATA = [
  'Portland Construction Work-OR',
  'East California Boulevard',
  'Downtown Office',
  'North Seattle Site',
  'Sacramento Yard',
  'Austin South District',
  'Phoenix Central Hub',
];
const MANAGERS = [
  { name: 'Tom Henderson',  title: 'Project Manager'  },
  { name: 'Sarah Collins',  title: 'Site Supervisor'  },
  { name: 'Mike Reyes',     title: 'General Foreman'  },
  { name: 'Linda Marsh',    title: 'HR Coordinator'   },
];
const SHIFT_CONFIGS = [
  { type: '4 × 10', start: '05:00 AM', end: '03:00 PM' },
  { type: '4 × 10', start: '06:00 AM', end: '04:00 PM' },
  { type: '5 × 8',  start: '07:00 AM', end: '03:30 PM' },
  { type: '5 × 8',  start: '08:00 AM', end: '04:30 PM' },
  { type: '3 × 12', start: '06:00 AM', end: '06:00 PM' },
];

function randomPhone() {
  const a = Math.floor(100 + Math.random()*899);
  const b = Math.floor(100 + Math.random()*899);
  const c = Math.floor(1000 + Math.random()*8999);
  return `(${a}) ${b}-${c}`;
}

function genRows(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const role = i === 0 ? 'Admin' : ROLES[Math.floor(Math.random()*ROLES.length)];
    const status = STATUSES[Math.floor(Math.random()*STATUSES.length)];
    const addr    = ADDRESSES[i % ADDRESSES.length];
    const mgr     = MANAGERS[i % MANAGERS.length];
    const shift   = SHIFT_CONFIGS[i % SHIFT_CONFIGS.length];
    out.push({
      id: i+1,
      first,
      last,
      code: i < 4 ? '' : String(10100 + i * 13),
      role,
      title: role === 'Worker' ? TITLES[Math.floor(Math.random()*TITLES.length)] : (role === 'Foreman' ? 'Lead Foreman' : role === 'Supervisor' ? 'Site Supervisor' : 'HR Coordinator'),
      dept: DEPTS[Math.floor(Math.random()*DEPTS.length)],
      branch: BRANCHES[Math.floor(Math.random()*BRANCHES.length)],
      status,
      phone: randomPhone(),
      email: Math.random() < 0.4 ? `${first.toLowerCase()}.${last.toLowerCase()}@bigcat.com` : '',
      hire: '11/01/2025',
      start: '11/01/2025',
      avatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
      hasFaceId: Math.random() < 0.85,
      hasMessaging: Math.random() < 0.7,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      workplaces: [WORKPLACES_DATA[i % WORKPLACES_DATA.length]],
      manager: mgr.name,
      managerTitle: mgr.title,
      shiftType: shift.type,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      emergencyContact: '',
      emergencyPhone: '',
      ssn: '',
      ssnLast4: String(1000 + (i * 7919) % 9000),
    });
  }
  return out;
}

const ALL_DATA = genRows(347);
