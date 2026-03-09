const STATUS_OPTIONS = [
  { value: 0, label: 'Planowane' },
  { value: 1, label: 'W realizacji' },
  { value: 2, label: 'Zrealizowane' },
  { value: 3, label: 'Anulowane' },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Wysoki' },
  { value: 1, label: 'Sredni' },
  { value: 2, label: 'Niski' },
];

const FOIL_TYPE_OPTIONS = [
  { value: 0, label: 'HDPE' },
  { value: 1, label: 'LDPE' },
  { value: 2, label: 'MDPE' },
];

const GROUP_OPTIONS = ['admin', 'manager', 'operator'];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));
const PRIORITY_LABELS = Object.fromEntries(PRIORITY_OPTIONS.map((item) => [item.value, item.label]));
const FOIL_LABELS = Object.fromEntries(FOIL_TYPE_OPTIONS.map((item) => [item.value, item.label]));
const EXTRUDER_LABELS = {
  0: 'W1',
  1: 'W2',
  2: 'W3',
  3: 'W4',
  4: 'W5',
};
const FOIL_CORRECTION_MULTIPLIER_THRESHOLD = 10;

const MOCK_USER = {
  id: 1,
  username: 'demo',
  first_name: 'Demo',
  last_name: 'User',
  email: 'demo@example.com',
  groups: ['admin'],
  phone_number: '600700800',
  permissions: {
    can_edit_orders: true,
    can_change_order_status: true,
    can_manage_production: true,
    can_write_rolls: true,
    can_use_calculator: true,
    can_manage_users: true,
    can_view_reports: true,
    is_manager: true,
    is_admin: true,
    is_worker: false,
  },
};

const today = new Date().toISOString().slice(0, 10);

const makeOrder = (order) => ({
  ...order,
  status_label: STATUS_LABELS[order.Status] || 'Nieznany',
  priority_label: PRIORITY_LABELS[order.Priorytet] || 'Nieznany',
  foil_type_label: FOIL_LABELS[order.Rodzaj] || 'Nieznany',
  nrwyt_label: EXTRUDER_LABELS[order.NrWytl] || `W${Number(order.NrWytl || 0) + 1}`,
  tasma_label: order.Tasma ? 'Tak' : 'Nie',
});

const state = {
  token: 'mock-token',
  nextOrderId: 27,
  nextUserId: 7,
  nextRollId: 14,
  orders: [
    {
      id: 1,
      NrZp: '20260301/1001',
      Data: '2026-03-01',
      Artykul: 'Worek HDPE 35L',
      Kod: 'HD-35',
      MMK: 'MMK-01',
      Barwnik: 'Blue',
      Status: 1,
      Priorytet: 0,
      Rodzaj: 0,
      IloscZlec: 12000,
      SzerWorka: 300,
      SzerRekawa: 360,
      Zakladka: 30,
      DlugWorka: 500,
      GrubWorka: 35,
      DlugFoilPlan_Korekta: 6100,
      WagaFoliZlec: 105,
      DlugFoliPlan: 6000,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 1015,
      DlugRolkiPlan: 1000,
      DlugFoliZlec_Korekta: 6090,
      WagaRolkiZlec: 17.5,
      NrWytl: 0,
      Tasma: false,
      Uwagi: 'Priorytet klienta',
    },
    {
      id: 2,
      NrZp: '20260302/1002',
      Data: '2026-03-02',
      Artykul: 'Worek LDPE 60L',
      Kod: 'LD-60',
      MMK: 'MMK-02',
      Barwnik: 'Transparent',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 1,
      IloscZlec: 8500,
      SzerWorka: 420,
      SzerRekawa: 500,
      Zakladka: 40,
      DlugWorka: 700,
      GrubWorka: 45,
      DlugFoilPlan_Korekta: 6100,
      WagaFoliZlec: 150,
      DlugFoliPlan: 5950,
      IloscRolekZlec: 8,
      DlugRolkiZlec_Korekta: 760,
      DlugRolkiPlan: 744,
      DlugFoliZlec_Korekta: 6080,
      WagaRolkiZlec: 18.7,
      NrWytl: 1,
      Tasma: true,
      Uwagi: '',
    },
    {
      id: 3,
      NrZp: '20260303/1003',
      Data: '2026-03-03',
      Artykul: 'Worek MDPE 20L',
      Kod: 'MD-20',
      MMK: '',
      Barwnik: 'Green',
      Status: 0,
      Priorytet: 2,
      Rodzaj: 2,
      IloscZlec: 5000,
      SzerWorka: 220,
      SzerRekawa: 260,
      Zakladka: 20,
      DlugWorka: 420,
      GrubWorka: 28,
      DlugFoilPlan_Korekta: 2150,
      WagaFoliZlec: 52,
      DlugFoliPlan: 2100,
      IloscRolekZlec: 4,
      DlugRolkiZlec_Korekta: 540,
      DlugRolkiPlan: 525,
      DlugFoliZlec_Korekta: 2160,
      WagaRolkiZlec: 13,
      NrWytl: 2,
      Tasma: false,
      Uwagi: 'Start po weekendzie',
    },
    {
      id: 4,
      NrZp: '20260304/1004',
      Data: '2026-03-04',
      Artykul: 'Worek HDPE 80L',
      Kod: 'HD-80',
      MMK: 'MMK-03',
      Barwnik: 'Black',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 0,
      IloscZlec: 9600,
      SzerWorka: 500,
      SzerRekawa: 600,
      Zakladka: 50,
      DlugWorka: 900,
      GrubWorka: 55,
      DlugFoilPlan_Korekta: 8700,
      WagaFoliZlec: 260,
      DlugFoliPlan: 8640,
      IloscRolekZlec: 9,
      DlugRolkiZlec_Korekta: 970,
      DlugRolkiPlan: 960,
      DlugFoliZlec_Korekta: 8730,
      WagaRolkiZlec: 28.9,
      NrWytl: 0,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 5,
      NrZp: '20260305/1005',
      Data: '2026-03-05',
      Artykul: 'Worek LDPE 45L',
      Kod: 'LD-45',
      MMK: '',
      Barwnik: 'Red',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 1,
      IloscZlec: 6400,
      SzerWorka: 320,
      SzerRekawa: 380,
      Zakladka: 30,
      DlugWorka: 620,
      GrubWorka: 40,
      DlugFoilPlan_Korekta: 4040,
      WagaFoliZlec: 102,
      DlugFoliPlan: 3968,
      IloscRolekZlec: 5,
      DlugRolkiZlec_Korekta: 810,
      DlugRolkiPlan: 793.6,
      DlugFoliZlec_Korekta: 4050,
      WagaRolkiZlec: 20.4,
      NrWytl: 1,
      Tasma: true,
      Uwagi: 'Anulowane przez klienta',
    },
    {
      id: 6,
      NrZp: '20260306/1006',
      Data: '2026-03-06',
      Artykul: 'Worek HDPE 50L',
      Kod: 'HD-50',
      MMK: 'MMK-04',
      Barwnik: 'Yellow',
      Status: 1,
      Priorytet: 0,
      Rodzaj: 0,
      IloscZlec: 11000,
      SzerWorka: 350,
      SzerRekawa: 420,
      Zakladka: 35,
      DlugWorka: 650,
      GrubWorka: 38,
      DlugFoilPlan_Korekta: 7160,
      WagaFoliZlec: 148,
      DlugFoliPlan: 7150,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 1025,
      DlugRolkiPlan: 1021,
      DlugFoliZlec_Korekta: 7175,
      WagaRolkiZlec: 21.1,
      NrWytl: 3,
      Tasma: false,
      Uwagi: 'Staly odbiorca',
    },
    {
      id: 7,
      NrZp: '20260307/1007',
      Data: '2026-03-07',
      Artykul: 'Worek LDPE 70L',
      Kod: 'LD-70',
      MMK: '',
      Barwnik: 'Transparent',
      Status: 0,
      Priorytet: 1,
      Rodzaj: 1,
      IloscZlec: 4200,
      SzerWorka: 480,
      SzerRekawa: 560,
      Zakladka: 40,
      DlugWorka: 760,
      GrubWorka: 50,
      DlugFoilPlan_Korekta: 3220,
      WagaFoliZlec: 120,
      DlugFoliPlan: 3192,
      IloscRolekZlec: 5,
      DlugRolkiZlec_Korekta: 650,
      DlugRolkiPlan: 638.4,
      DlugFoliZlec_Korekta: 3250,
      WagaRolkiZlec: 24,
      NrWytl: 4,
      Tasma: true,
      Uwagi: 'Do potwierdzenia koloru',
    },
    {
      id: 8,
      NrZp: '20260308/1008',
      Data: '2026-03-08',
      Artykul: 'Worek MDPE 30L',
      Kod: 'MD-30',
      MMK: 'MMK-05',
      Barwnik: 'Gray',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 2,
      IloscZlec: 9500,
      SzerWorka: 280,
      SzerRekawa: 340,
      Zakladka: 30,
      DlugWorka: 520,
      GrubWorka: 32,
      DlugFoilPlan_Korekta: 4960,
      WagaFoliZlec: 92,
      DlugFoliPlan: 4940,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 710,
      DlugRolkiPlan: 705,
      DlugFoliZlec_Korekta: 4970,
      WagaRolkiZlec: 13.2,
      NrWytl: 2,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 9,
      NrZp: '20260309/1009',
      Data: '2026-03-09',
      Artykul: 'Worek HDPE 120L',
      Kod: 'HD-120',
      MMK: 'MMK-06',
      Barwnik: 'Blue',
      Status: 1,
      Priorytet: 0,
      Rodzaj: 0,
      IloscZlec: 7500,
      SzerWorka: 620,
      SzerRekawa: 740,
      Zakladka: 60,
      DlugWorka: 1100,
      GrubWorka: 60,
      DlugFoilPlan_Korekta: 8260,
      WagaFoliZlec: 330,
      DlugFoliPlan: 8250,
      IloscRolekZlec: 10,
      DlugRolkiZlec_Korekta: 830,
      DlugRolkiPlan: 825,
      DlugFoliZlec_Korekta: 8270,
      WagaRolkiZlec: 33,
      NrWytl: 0,
      Tasma: false,
      Uwagi: 'Kontrola jakosci co 2 rolki',
    },
    {
      id: 10,
      NrZp: '20260310/1010',
      Data: '2026-03-10',
      Artykul: 'Worek LDPE 25L',
      Kod: 'LD-25',
      MMK: '',
      Barwnik: 'White',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 1,
      IloscZlec: 6800,
      SzerWorka: 250,
      SzerRekawa: 300,
      Zakladka: 25,
      DlugWorka: 450,
      GrubWorka: 30,
      DlugFoilPlan_Korekta: 3080,
      WagaFoliZlec: 62,
      DlugFoliPlan: 3060,
      IloscRolekZlec: 4,
      DlugRolkiZlec_Korekta: 775,
      DlugRolkiPlan: 765,
      DlugFoliZlec_Korekta: 3090,
      WagaRolkiZlec: 15.5,
      NrWytl: 1,
      Tasma: true,
      Uwagi: 'Wstrzymane po reklamacji',
    },
    {
      id: 11,
      NrZp: '20260311/1011',
      Data: '2026-03-11',
      Artykul: 'Worek MDPE 90L',
      Kod: 'MD-90',
      MMK: 'MMK-07',
      Barwnik: 'Black',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 2,
      IloscZlec: 5900,
      SzerWorka: 540,
      SzerRekawa: 640,
      Zakladka: 50,
      DlugWorka: 980,
      GrubWorka: 52,
      DlugFoilPlan_Korekta: 5800,
      WagaFoliZlec: 240,
      DlugFoliPlan: 5782,
      IloscRolekZlec: 8,
      DlugRolkiZlec_Korekta: 730,
      DlugRolkiPlan: 722.75,
      DlugFoliZlec_Korekta: 5815,
      WagaRolkiZlec: 30,
      NrWytl: 3,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 12,
      NrZp: '20260312/1012',
      Data: '2026-03-12',
      Artykul: 'Worek HDPE 15L',
      Kod: 'HD-15',
      MMK: '',
      Barwnik: 'Natural',
      Status: 1,
      Priorytet: 2,
      Rodzaj: 0,
      IloscZlec: 15500,
      SzerWorka: 190,
      SzerRekawa: 230,
      Zakladka: 20,
      DlugWorka: 360,
      GrubWorka: 24,
      DlugFoilPlan_Korekta: 5600,
      WagaFoliZlec: 74,
      DlugFoliPlan: 5580,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 940,
      DlugRolkiPlan: 930,
      DlugFoliZlec_Korekta: 5620,
      WagaRolkiZlec: 12.3,
      NrWytl: 4,
      Tasma: false,
      Uwagi: 'Szybka seria',
    },
    {
      id: 13,
      NrZp: '20260313/1013',
      Data: '2026-03-13',
      Artykul: 'Worek LDPE 110L',
      Kod: 'LD-110',
      MMK: 'MMK-08',
      Barwnik: 'Blue',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 1,
      IloscZlec: 6300,
      SzerWorka: 590,
      SzerRekawa: 700,
      Zakladka: 55,
      DlugWorka: 1020,
      GrubWorka: 58,
      DlugFoilPlan_Korekta: 6430,
      WagaFoliZlec: 280,
      DlugFoliPlan: 6426,
      IloscRolekZlec: 8,
      DlugRolkiZlec_Korekta: 805,
      DlugRolkiPlan: 803.25,
      DlugFoliZlec_Korekta: 6440,
      WagaRolkiZlec: 35,
      NrWytl: 3,
      Tasma: true,
      Uwagi: '',
    },
    {
      id: 14,
      NrZp: '20260314/1014',
      Data: '2026-03-14',
      Artykul: 'Worek HDPE 22L',
      Kod: 'HD-22',
      MMK: '',
      Barwnik: 'Natural',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 0,
      IloscZlec: 13800,
      SzerWorka: 215,
      SzerRekawa: 260,
      Zakladka: 22.5,
      DlugWorka: 390,
      GrubWorka: 26,
      DlugFoilPlan_Korekta: 5390,
      WagaFoliZlec: 80,
      DlugFoliPlan: 5382,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 900,
      DlugRolkiPlan: 897,
      DlugFoliZlec_Korekta: 5400,
      WagaRolkiZlec: 13.3,
      NrWytl: 4,
      Tasma: false,
      Uwagi: 'Anulowane przez klienta - zmiana specyfikacji',
    },
    {
      id: 15,
      NrZp: '20260315/1015',
      Data: '2026-03-15',
      Artykul: 'Worek MDPE 55L',
      Kod: 'MD-55',
      MMK: 'MMK-09',
      Barwnik: 'Gray',
      Status: 2,
      Priorytet: 0,
      Rodzaj: 2,
      IloscZlec: 9100,
      SzerWorka: 390,
      SzerRekawa: 470,
      Zakladka: 40,
      DlugWorka: 680,
      GrubWorka: 42,
      DlugFoilPlan_Korekta: 6200,
      WagaFoliZlec: 170,
      DlugFoliPlan: 6188,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 890,
      DlugRolkiPlan: 884,
      DlugFoliZlec_Korekta: 6215,
      WagaRolkiZlec: 24.3,
      NrWytl: 2,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 16,
      NrZp: '20260316/1016',
      Data: '2026-03-16',
      Artykul: 'Worek HDPE 95L',
      Kod: 'HD-95',
      MMK: 'MMK-10',
      Barwnik: 'Black',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 0,
      IloscZlec: 7200,
      SzerWorka: 560,
      SzerRekawa: 670,
      Zakladka: 55,
      DlugWorka: 980,
      GrubWorka: 57,
      DlugFoilPlan_Korekta: 7070,
      WagaFoliZlec: 295,
      DlugFoliPlan: 7056,
      IloscRolekZlec: 9,
      DlugRolkiZlec_Korekta: 790,
      DlugRolkiPlan: 784,
      DlugFoliZlec_Korekta: 7090,
      WagaRolkiZlec: 32.8,
      NrWytl: 0,
      Tasma: false,
      Uwagi: 'Zakonczone przed terminem',
    },
    {
      id: 17,
      NrZp: '20260317/1017',
      Data: '2026-03-17',
      Artykul: 'Worek LDPE 32L',
      Kod: 'LD-32',
      MMK: '',
      Barwnik: 'Red',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 1,
      IloscZlec: 7600,
      SzerWorka: 290,
      SzerRekawa: 350,
      Zakladka: 30,
      DlugWorka: 540,
      GrubWorka: 34,
      DlugFoilPlan_Korekta: 4120,
      WagaFoliZlec: 98,
      DlugFoliPlan: 4104,
      IloscRolekZlec: 5,
      DlugRolkiZlec_Korekta: 830,
      DlugRolkiPlan: 820.8,
      DlugFoliZlec_Korekta: 4140,
      WagaRolkiZlec: 19.6,
      NrWytl: 1,
      Tasma: true,
      Uwagi: 'Anulowane - brak surowca',
    },
    {
      id: 18,
      NrZp: '20260318/1018',
      Data: '2026-03-18',
      Artykul: 'Worek MDPE 75L',
      Kod: 'MD-75',
      MMK: 'MMK-11',
      Barwnik: 'Transparent',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 2,
      IloscZlec: 6800,
      SzerWorka: 510,
      SzerRekawa: 610,
      Zakladka: 50,
      DlugWorka: 860,
      GrubWorka: 49,
      DlugFoilPlan_Korekta: 5860,
      WagaFoliZlec: 225,
      DlugFoliPlan: 5848,
      IloscRolekZlec: 8,
      DlugRolkiZlec_Korekta: 735,
      DlugRolkiPlan: 731,
      DlugFoliZlec_Korekta: 5880,
      WagaRolkiZlec: 28.1,
      NrWytl: 3,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 19,
      NrZp: '20260319/1019',
      Data: '2026-03-19',
      Artykul: 'Worek HDPE 40L',
      Kod: 'HD-40',
      MMK: '',
      Barwnik: 'Yellow',
      Status: 3,
      Priorytet: 0,
      Rodzaj: 0,
      IloscZlec: 9900,
      SzerWorka: 330,
      SzerRekawa: 400,
      Zakladka: 35,
      DlugWorka: 610,
      GrubWorka: 37,
      DlugFoilPlan_Korekta: 6060,
      WagaFoliZlec: 128,
      DlugFoliPlan: 6039,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 1015,
      DlugRolkiPlan: 1006.5,
      DlugFoliZlec_Korekta: 6090,
      WagaRolkiZlec: 21.3,
      NrWytl: 4,
      Tasma: false,
      Uwagi: 'Anulowane - blad etykiety',
    },
    {
      id: 20,
      NrZp: '20260320/1020',
      Data: '2026-03-20',
      Artykul: 'Worek LDPE 85L',
      Kod: 'LD-85',
      MMK: 'MMK-12',
      Barwnik: 'White',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 1,
      IloscZlec: 5400,
      SzerWorka: 530,
      SzerRekawa: 630,
      Zakladka: 50,
      DlugWorka: 920,
      GrubWorka: 54,
      DlugFoilPlan_Korekta: 4980,
      WagaFoliZlec: 205,
      DlugFoliPlan: 4968,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 715,
      DlugRolkiPlan: 709.7,
      DlugFoliZlec_Korekta: 5005,
      WagaRolkiZlec: 29.3,
      NrWytl: 2,
      Tasma: true,
      Uwagi: '',
    },
    {
      id: 21,
      NrZp: '20260321/1021',
      Data: '2026-03-21',
      Artykul: 'Worek MDPE 18L',
      Kod: 'MD-18',
      MMK: '',
      Barwnik: 'Natural',
      Status: 2,
      Priorytet: 2,
      Rodzaj: 2,
      IloscZlec: 12400,
      SzerWorka: 205,
      SzerRekawa: 248,
      Zakladka: 21.5,
      DlugWorka: 340,
      GrubWorka: 23,
      DlugFoilPlan_Korekta: 4240,
      WagaFoliZlec: 58,
      DlugFoliPlan: 4216,
      IloscRolekZlec: 5,
      DlugRolkiZlec_Korekta: 850,
      DlugRolkiPlan: 843.2,
      DlugFoliZlec_Korekta: 4250,
      WagaRolkiZlec: 11.6,
      NrWytl: 1,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 22,
      NrZp: '20260322/1022',
      Data: '2026-03-22',
      Artykul: 'Worek HDPE 65L',
      Kod: 'HD-65',
      MMK: 'MMK-13',
      Barwnik: 'Green',
      Status: 3,
      Priorytet: 1,
      Rodzaj: 0,
      IloscZlec: 8100,
      SzerWorka: 450,
      SzerRekawa: 540,
      Zakladka: 45,
      DlugWorka: 760,
      GrubWorka: 46,
      DlugFoilPlan_Korekta: 6170,
      WagaFoliZlec: 176,
      DlugFoliPlan: 6156,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 885,
      DlugRolkiPlan: 879.4,
      DlugFoliZlec_Korekta: 6190,
      WagaRolkiZlec: 25.1,
      NrWytl: 0,
      Tasma: false,
      Uwagi: 'Anulowane po audycie jakosci',
    },
    {
      id: 23,
      NrZp: '20260323/1023',
      Data: '2026-03-23',
      Artykul: 'Worek LDPE 95L',
      Kod: 'LD-95',
      MMK: 'MMK-14',
      Barwnik: 'Black',
      Status: 2,
      Priorytet: 0,
      Rodzaj: 1,
      IloscZlec: 4700,
      SzerWorka: 570,
      SzerRekawa: 680,
      Zakladka: 55,
      DlugWorka: 1000,
      GrubWorka: 59,
      DlugFoilPlan_Korekta: 4710,
      WagaFoliZlec: 240,
      DlugFoliPlan: 4700,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 790,
      DlugRolkiPlan: 783.3,
      DlugFoliZlec_Korekta: 4740,
      WagaRolkiZlec: 40,
      NrWytl: 3,
      Tasma: true,
      Uwagi: '',
    },
    {
      id: 24,
      NrZp: '20260324/1024',
      Data: '2026-03-24',
      Artykul: 'Worek MDPE 42L',
      Kod: 'MD-42',
      MMK: '',
      Barwnik: 'Blue',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 2,
      IloscZlec: 8800,
      SzerWorka: 345,
      SzerRekawa: 415,
      Zakladka: 35,
      DlugWorka: 600,
      GrubWorka: 36,
      DlugFoilPlan_Korekta: 5290,
      WagaFoliZlec: 118,
      DlugFoliPlan: 5280,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 885,
      DlugRolkiPlan: 880,
      DlugFoliZlec_Korekta: 5310,
      WagaRolkiZlec: 19.7,
      NrWytl: 2,
      Tasma: false,
      Uwagi: 'Anulowane - przesuniecie dostawy',
    },
    {
      id: 25,
      NrZp: '20260325/1025',
      Data: '2026-03-25',
      Artykul: 'Worek HDPE 72L',
      Kod: 'HD-72',
      MMK: 'MMK-15',
      Barwnik: 'Transparent',
      Status: 2,
      Priorytet: 1,
      Rodzaj: 0,
      IloscZlec: 7400,
      SzerWorka: 495,
      SzerRekawa: 590,
      Zakladka: 47.5,
      DlugWorka: 810,
      GrubWorka: 48,
      DlugFoilPlan_Korekta: 6010,
      WagaFoliZlec: 192,
      DlugFoliPlan: 5994,
      IloscRolekZlec: 7,
      DlugRolkiZlec_Korekta: 860,
      DlugRolkiPlan: 856.2,
      DlugFoliZlec_Korekta: 6030,
      WagaRolkiZlec: 27.4,
      NrWytl: 4,
      Tasma: false,
      Uwagi: '',
    },
    {
      id: 26,
      NrZp: '20260326/1026',
      Data: '2026-03-26',
      Artykul: 'Worek LDPE 52L',
      Kod: 'LD-52',
      MMK: '',
      Barwnik: 'Gray',
      Status: 3,
      Priorytet: 2,
      Rodzaj: 1,
      IloscZlec: 6900,
      SzerWorka: 370,
      SzerRekawa: 445,
      Zakladka: 37.5,
      DlugWorka: 660,
      GrubWorka: 41,
      DlugFoilPlan_Korekta: 4560,
      WagaFoliZlec: 132,
      DlugFoliPlan: 4554,
      IloscRolekZlec: 6,
      DlugRolkiZlec_Korekta: 765,
      DlugRolkiPlan: 759,
      DlugFoliZlec_Korekta: 4590,
      WagaRolkiZlec: 22,
      NrWytl: 1,
      Tasma: true,
      Uwagi: 'Anulowane - korekta zamowienia',
    },
  ],
  users: [
    {
      id: 1,
      username: 'demo',
      first_name: 'Demo',
      last_name: 'User',
      email: 'demo@example.com',
      groups: ['admin'],
      phone_number: '600700800',
    },
    {
      id: 2,
      username: 'operator1',
      first_name: 'Jan',
      last_name: 'Nowak',
      email: 'jan.nowak@example.com',
      groups: ['operator'],
      phone_number: '600111222',
    },
    {
      id: 3,
      username: 'manager1',
      first_name: 'Anna',
      last_name: 'Kowalska',
      email: 'anna.kowalska@example.com',
      groups: ['manager'],
      phone_number: '600333444',
    },
    {
      id: 4,
      username: 'operator2',
      first_name: 'Piotr',
      last_name: 'Zielinski',
      email: 'piotr.zielinski@example.com',
      groups: ['operator'],
      phone_number: '600555666',
    },
    {
      id: 5,
      username: 'manager2',
      first_name: 'Marta',
      last_name: 'Wrobel',
      email: 'marta.wrobel@example.com',
      groups: ['manager'],
      phone_number: '600777888',
    },
    {
      id: 6,
      username: 'operator3',
      first_name: 'Tomasz',
      last_name: 'Lewandowski',
      email: 'tomasz.lewandowski@example.com',
      groups: ['operator'],
      phone_number: '600999000',
    },
  ],
  rollsByOrder: {
    '20260301/1001': [
      {
        id: 1,
        Data: today,
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 980,
        WagaRolkiProd: 17,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 35,
        Wynik: 99,
        Mieszanka: 'Mix A',
        Uwagi: '',
        UserName: 'operator1',
      },
      {
        id: 2,
        Data: today,
        Zmiana: 'II',
        Rolka: 2,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 1010,
        WagaRolkiProd: 18,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 35,
        Wynik: 100,
        Mieszanka: 'Mix A',
        Uwagi: '',
        UserName: 'operator1',
      },
    ],
    '20260302/1002': [
      {
        id: 3,
        Data: today,
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 1,
        Rodzaj: 1,
        DlugRolkiProd: 760,
        WagaRolkiProd: 18.7,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 45,
        Wynik: 100,
        Mieszanka: 'Mix B',
        Uwagi: '',
        UserName: 'operator1',
      },
    ],
    '20260304/1004': [
      {
        id: 10,
        Data: '2026-03-04',
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 960,
        WagaRolkiProd: 28.7,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 55,
        Wynik: 99,
        Mieszanka: 'Mix E',
        Uwagi: '',
        UserName: 'operator1',
      },
      {
        id: 11,
        Data: '2026-03-04',
        Zmiana: 'II',
        Rolka: 2,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 970,
        WagaRolkiProd: 29.1,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 55,
        Wynik: 100,
        Mieszanka: 'Mix E',
        Uwagi: '',
        UserName: 'operator2',
      },
    ],
    '20260306/1006': [
      {
        id: 4,
        Data: '2026-03-06',
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 3,
        Rodzaj: 0,
        DlugRolkiProd: 1020,
        WagaRolkiProd: 21.4,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 38,
        Wynik: 99,
        Mieszanka: 'Mix C',
        Uwagi: '',
        UserName: 'operator2',
      },
      {
        id: 5,
        Data: '2026-03-06',
        Zmiana: 'II',
        Rolka: 2,
        NrWytl: 3,
        Rodzaj: 0,
        DlugRolkiProd: 1005,
        WagaRolkiProd: 20.9,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 38,
        Wynik: 98,
        Mieszanka: 'Mix C',
        Uwagi: 'Drobna korekta temperatury',
        UserName: 'operator2',
      },
    ],
    '20260308/1008': [
      {
        id: 6,
        Data: '2026-03-08',
        Zmiana: 'III',
        Rolka: 1,
        NrWytl: 2,
        Rodzaj: 2,
        DlugRolkiProd: 705,
        WagaRolkiProd: 13.1,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 32,
        Wynik: 100,
        Mieszanka: 'Mix D',
        Uwagi: '',
        UserName: 'operator3',
      },
    ],
    '20260309/1009': [
      {
        id: 7,
        Data: '2026-03-09',
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 820,
        WagaRolkiProd: 32.8,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 60,
        Wynik: 99,
        Mieszanka: 'Mix A+',
        Uwagi: '',
        UserName: 'operator1',
      },
      {
        id: 8,
        Data: '2026-03-09',
        Zmiana: 'II',
        Rolka: 2,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 835,
        WagaRolkiProd: 33.4,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 60,
        Wynik: 100,
        Mieszanka: 'Mix A+',
        Uwagi: '',
        UserName: 'operator1',
      },
      {
        id: 9,
        Data: '2026-03-09',
        Zmiana: 'III',
        Rolka: 3,
        NrWytl: 0,
        Rodzaj: 0,
        DlugRolkiProd: 810,
        WagaRolkiProd: 32.2,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 60,
        Wynik: 98,
        Mieszanka: 'Mix A+',
        Uwagi: 'Dodatkowa kontrola jakosci',
        UserName: 'operator2',
      },
    ],
    '20260311/1011': [
      {
        id: 12,
        Data: '2026-03-11',
        Zmiana: 'I',
        Rolka: 1,
        NrWytl: 3,
        Rodzaj: 2,
        DlugRolkiProd: 725,
        WagaRolkiProd: 29.8,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 52,
        Wynik: 99,
        Mieszanka: 'Mix F',
        Uwagi: '',
        UserName: 'operator3',
      },
      {
        id: 13,
        Data: '2026-03-11',
        Zmiana: 'II',
        Rolka: 2,
        NrWytl: 3,
        Rodzaj: 2,
        DlugRolkiProd: 735,
        WagaRolkiProd: 30.2,
        Slimak: 0,
        Walce: 0,
        Wynikowa: 52,
        Wynik: 100,
        Mieszanka: 'Mix F',
        Uwagi: '',
        UserName: 'operator3',
      },
    ],
  },
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizePath = (url) => {
  if (!url) return '';
  let path = String(url);
  const protocolIndex = path.indexOf('://');
  if (protocolIndex >= 0) {
    const slashIndex = path.indexOf('/', protocolIndex + 3);
    path = slashIndex >= 0 ? path.slice(slashIndex + 1) : '';
  }
  if (path.startsWith('/')) {
    path = path.slice(1);
  }
  if (path.startsWith('api/')) {
    path = path.slice(4);
  }
  path = path.split('?')[0];
  while (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
};

const parsePayload = (data) => {
  if (data === undefined || data === null || data === '') {
    return {};
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }
  return data;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toFixedNumber = (value, digits = 2) => Number(parseNumber(value).toFixed(digits));

const resolveEffectiveFoilLength = (plannedLength, correctionValue) => {
  const correction = parseNumber(correctionValue);
  if (!(correction > 0)) {
    return plannedLength > 0 ? plannedLength : 0;
  }
  if (correction <= FOIL_CORRECTION_MULTIPLIER_THRESHOLD) {
    return plannedLength > 0 ? plannedLength * correction : 0;
  }
  return correction;
};

const calculateOrderDerivedValues = (order) => {
  const szerRekawa = parseNumber(order.SzerRekawa);
  const szerWorka = parseNumber(order.SzerWorka);
  const iloscZlec = parseNumber(order.IloscZlec);
  const dlugWorka = parseNumber(order.DlugWorka);
  const grubWorka = parseNumber(order.GrubWorka);
  const iloscRolek = parseNumber(order.IloscRolekZlec);
  const dlugRolkiKorekta = parseNumber(order.DlugRolkiZlec_Korekta);
  const tasma = Boolean(order.Tasma);

  const zakladka = szerRekawa > 0 && szerWorka > 0 ? toFixedNumber((szerRekawa - szerWorka) / 2) : null;
  const dlugFoliPlan = iloscZlec > 0 && dlugWorka > 0 ? toFixedNumber((iloscZlec * dlugWorka) / 1000) : null;
  const effectiveFoilLength = resolveEffectiveFoilLength(dlugFoliPlan || 0, order.DlugFoilPlan_Korekta);

  let wagaFoliZlec = null;
  if (szerRekawa > 0 && grubWorka > 0 && effectiveFoilLength > 0) {
    const baseWeight = (szerRekawa / 1000) * (grubWorka / 1000) * effectiveFoilLength * 2 * 0.95;
    wagaFoliZlec = toFixedNumber(tasma ? baseWeight / 2 : baseWeight);
  }

  const dlugRolkiPlan =
    effectiveFoilLength > 0 && iloscRolek > 0 ? toFixedNumber(effectiveFoilLength / iloscRolek) : null;
  const wagaRolkiZlec =
    wagaFoliZlec !== null && iloscRolek > 0 ? toFixedNumber(wagaFoliZlec / iloscRolek) : null;

  let dlugFoliZlecKorekta = null;
  if (dlugRolkiKorekta > 0 && iloscRolek > 0) {
    dlugFoliZlecKorekta = toFixedNumber(dlugRolkiKorekta * iloscRolek);
  } else if (parseNumber(order.DlugFoilPlan_Korekta) > 0 && effectiveFoilLength > 0) {
    dlugFoliZlecKorekta = toFixedNumber(effectiveFoilLength);
  }

  return {
    ...order,
    Zakladka: zakladka,
    DlugFoliPlan: dlugFoliPlan,
    WagaFoliZlec: wagaFoliZlec,
    DlugRolkiPlan: dlugRolkiPlan,
    DlugFoliZlec_Korekta: dlugFoliZlecKorekta,
    WagaRolkiZlec: wagaRolkiZlec,
  };
};

const paginate = (items, page = 1, pageSize = 10) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const results = items.slice(start, end);
  return {
    count: items.length,
    next: end < items.length ? `?page=${currentPage + 1}` : null,
    previous: start > 0 ? `?page=${currentPage - 1}` : null,
    results,
  };
};

const withOrderLabels = (orders) => orders.map((order) => makeOrder(order));

const findOrderById = (id) => state.orders.find((order) => order.id === Number(id));

const getFilteredOrders = (params = {}) => {
  const status = params.status;
  const q = String(params.q || '').trim().toLowerCase();
  const dateFrom = String(params.date_from || '').trim();
  const dateTo = String(params.date_to || '').trim();

  return state.orders.filter((order) => {
    if (status !== undefined && status !== null && status !== '') {
      const requestedStatus = Number(status);
      if (requestedStatus === 3) {
        if (![2, 3].includes(Number(order.Status))) {
          return false;
        }
      } else if (Number(order.Status) !== requestedStatus) {
        return false;
      }
    }
    if (q && !String(order.NrZp || '').toLowerCase().includes(q)) {
      return false;
    }
    if (dateFrom && String(order.Data || '') < dateFrom) {
      return false;
    }
    if (dateTo && String(order.Data || '') > dateTo) {
      return false;
    }
    return true;
  });
};

const buildHomeSummary = () => {
  const byStatus = STATUS_OPTIONS.reduce((acc, item) => ({ ...acc, [item.label]: 0 }), {});
  let totalOrders = 0;
  state.orders.forEach((order) => {
    const label = STATUS_LABELS[order.Status];
    if (label && Object.prototype.hasOwnProperty.call(byStatus, label)) {
      byStatus[label] += 1;
    }
    totalOrders += 1;
  });
  return {
    stats: {
      total_orders: totalOrders,
      by_status: byStatus,
    },
  };
};

const calculateSummary = (orderCode) => {
  const rolls = state.rollsByOrder[orderCode] || [];
  const order = state.orders.find((item) => item.NrZp === orderCode);
  const weightProduced = rolls.reduce((sum, roll) => sum + parseNumber(roll.WagaRolkiProd), 0);
  const lengthProduced = rolls.reduce((sum, roll) => sum + parseNumber(roll.DlugRolkiProd), 0);
  const plannedLength =
    parseNumber(order?.DlugFoliZlec_Korekta) ||
    resolveEffectiveFoilLength(parseNumber(order?.DlugFoliPlan), order?.DlugFoilPlan_Korekta);
  const plannedWeight = parseNumber(order?.WagaFoliZlec);
  const targetRolls = parseNumber(order?.IloscRolekZlec);
  const weightRemaining = Math.max(plannedWeight - weightProduced, 0);
  const lengthRemaining = Math.max(plannedLength - lengthProduced, 0);
  const rollsRemaining = Math.max(targetRolls - rolls.length, 0);
  const progressPercent =
    plannedLength > 0 ? Math.min(100, Math.round((lengthProduced / plannedLength) * 100)) : 0;

  return {
    weight_produced: toFixedNumber(weightProduced),
    weight_remaining: toFixedNumber(weightRemaining),
    length_produced: toFixedNumber(lengthProduced),
    length_remaining: toFixedNumber(lengthRemaining),
    rolls_produced: rolls.length,
    rolls_remaining: toFixedNumber(rollsRemaining),
    progress_percent: progressPercent,
  };
};

const buildOrderProgressMap = (orderNumbers = []) =>
  orderNumbers.reduce((acc, orderNumber) => {
    const normalizedOrderNumber = String(orderNumber || '').trim();
    if (!normalizedOrderNumber) {
      return acc;
    }
    acc[normalizedOrderNumber] = calculateSummary(normalizedOrderNumber);
    return acc;
  }, {});

const buildProductionReport = () => {
  const rows = [];
  Object.entries(state.rollsByOrder).forEach(([orderCode, rolls]) => {
    const order = state.orders.find((item) => item.NrZp === orderCode);
    rolls.forEach((roll) => {
      rows.push({
        NrZp: orderCode,
        Data: roll.Data,
        Zmiana: roll.Zmiana,
        Rolka: roll.Rolka,
        NrWytl: order?.NrWytl ?? roll.NrWytl ?? 0,
        Rodzaj: order?.Rodzaj ?? roll.Rodzaj ?? 0,
        DlugRolkiProd: roll.DlugRolkiProd,
        WagaRolkiProd: roll.WagaRolkiProd,
        UserName: roll.UserName,
      });
    });
  });
  return rows.sort((left, right) => String(right.Data || '').localeCompare(String(left.Data || '')));
};

const buildCompletedProductionReport = (params = {}) => {
  const dateFrom = String(params.date_from || '').trim();
  const dateTo = String(params.date_to || '').trim();
  const extruder = String(params.extruder || '').trim();
  const searchTerm = String(params.q || '').trim().toLowerCase();

  const completedOrderMap = new Map(
    state.orders
      .filter((order) => Number(order.Status) === 2)
      .map((order) => [order.NrZp, order])
  );

  const rows = [];
  completedOrderMap.forEach((order, orderCode) => {
    const rolls = state.rollsByOrder[orderCode] || [];
    rolls.forEach((roll) => {
      const extruderValue = order.NrWytl ?? roll.NrWytl ?? 0;
      const row = {
        id: roll.id,
        NrZp: orderCode,
        Data: roll.Data,
        Zmiana: roll.Zmiana,
        Rolka: roll.Rolka,
        NrWytl: extruderValue,
        nrwyt_label: EXTRUDER_LABELS[extruderValue] || `W${Number(extruderValue) + 1}`,
        Rodzaj: order.Rodzaj ?? roll.Rodzaj,
        foil_type_label: FOIL_LABELS[order.Rodzaj ?? roll.Rodzaj] || 'Nieznany',
        Artykul: order.Artykul || '',
        SzerWorka: order.SzerWorka ?? null,
        SzerRekawa: order.SzerRekawa ?? null,
        Zakladka: order.Zakladka ?? null,
        GrubWorka: order.GrubWorka ?? null,
        DlugRolkiProd: roll.DlugRolkiProd,
        WagaRolkiProd: roll.WagaRolkiProd,
        UserName: roll.UserName || '',
        Mieszanka: roll.Mieszanka || '',
        Uwagi: roll.Uwagi || '',
        order_uwagi: order.Uwagi || '',
        Wynikowa: roll.Wynikowa ?? null,
        Wynik: roll.Wynik ?? null,
        Slimak: roll.Slimak ?? null,
        Walce: roll.Walce ?? null,
      };

      if (dateFrom && String(row.Data || '') < dateFrom) {
        return;
      }
      if (dateTo && String(row.Data || '') > dateTo) {
        return;
      }
      if (extruder && String(row.NrWytl) !== extruder) {
        return;
      }
      if (searchTerm) {
        const searchable = [
          row.NrZp,
          row.Data,
          row.Zmiana,
          row.Rolka,
          row.nrwyt_label,
          row.Artykul,
          row.foil_type_label,
          row.UserName,
          row.Mieszanka,
          row.Uwagi,
          row.order_uwagi,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(searchTerm)) {
          return;
        }
      }

      rows.push(row);
    });
  });

  rows.sort((left, right) => {
    if (left.Data === right.Data) {
      if (left.NrWytl === right.NrWytl) {
        if (left.NrZp === right.NrZp) {
          return Number(left.Rolka || 0) - Number(right.Rolka || 0);
        }
        return String(left.NrZp).localeCompare(String(right.NrZp));
      }
      return Number(left.NrWytl || 0) - Number(right.NrWytl || 0);
    }
    return String(right.Data).localeCompare(String(left.Data));
  });

  return paginate(rows, params.page || 1, Math.max(1, Number(params.page_size) || 25));
};

const buildOperatorReport = () => {
  const grouped = {};
  buildProductionReport().forEach((row) => {
    const key = `${row.Data}|${row.Zmiana}|${row.NrWytl ?? 0}|${row.UserName}`;
    if (!grouped[key]) {
      grouped[key] = {
        Data: row.Data,
        Zmiana: row.Zmiana,
        NrWytl: row.NrWytl ?? 0,
        UserName: row.UserName,
        total_waga: 0,
        total_dlugosc: 0,
      };
    }
    grouped[key].total_waga += parseNumber(row.WagaRolkiProd);
    grouped[key].total_dlugosc += parseNumber(row.DlugRolkiProd);
  });
  return Object.values(grouped)
    .map((item) => ({
      ...item,
      total_waga: toFixedNumber(item.total_waga),
      total_dlugosc: toFixedNumber(item.total_dlugosc),
    }))
    .sort((left, right) => {
      if (left.Data === right.Data) {
        return String(left.UserName || '').localeCompare(String(right.UserName || ''));
      }
      return String(right.Data || '').localeCompare(String(left.Data || ''));
    });
};

const buildOrderStatusReport = () =>
  withOrderLabels([...state.orders]).sort((left, right) => String(right.Data || '').localeCompare(String(left.Data || '')));

const buildWorkersReport = (params = {}) => {
  const dateFrom = String(params.date_from || '').trim();
  const dateTo = String(params.date_to || '').trim();
  const shift = String(params.shift || '').trim();
  const operator = String(params.operator || '').trim().toLowerCase();
  const searchTerm = String(params.q || '').trim().toLowerCase();
  const grouped = new Map();

  Object.entries(state.rollsByOrder).forEach(([orderCode, rolls]) => {
    const order = state.orders.find((item) => item.NrZp === orderCode);
    rolls.forEach((roll) => {
      if (dateFrom && String(roll.Data || '') < dateFrom) {
        return;
      }
      if (dateTo && String(roll.Data || '') > dateTo) {
        return;
      }
      if (shift && String(roll.Zmiana || '') !== shift) {
        return;
      }

      const extruderValue = order?.NrWytl ?? roll.NrWytl ?? 0;
      const foilValue = order?.Rodzaj ?? roll.Rodzaj ?? 0;
      const key = `${roll.Data}|${roll.Zmiana}|${extruderValue}|${foilValue}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          Data: roll.Data,
          Zmiana: roll.Zmiana,
          NrWytl: extruderValue,
          nrwyt_label: EXTRUDER_LABELS[extruderValue] || `W${Number(extruderValue) + 1}`,
          Rodzaj: foilValue,
          foil_type_label: FOIL_LABELS[foilValue] || 'Nieznany',
          total_waga: 0,
          total_dlugosc: 0,
          operatorSet: new Set(),
        });
      }

      const current = grouped.get(key);
      current.total_waga += parseNumber(roll.WagaRolkiProd);
      current.total_dlugosc += parseNumber(roll.DlugRolkiProd);
      current.operatorSet.add(roll.UserName || '—');
    });
  });

  const rows = Array.from(grouped.values()).map((row) => ({
    ...row,
    total_waga: toFixedNumber(row.total_waga),
    total_dlugosc: toFixedNumber(row.total_dlugosc),
    operators: Array.from(row.operatorSet).sort((left, right) => left.localeCompare(right)).join(', '),
  }));

  const filtered = rows.filter((row) => {
    if (operator && !String(row.operators || '').toLowerCase().includes(operator)) {
      return false;
    }
    if (searchTerm) {
      const searchable = [
        row.Data,
        row.Zmiana,
        row.NrWytl,
        row.nrwyt_label,
        row.foil_type_label,
        row.operators,
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  filtered.sort((left, right) => {
    if (left.Data === right.Data) {
      if (left.Zmiana === right.Zmiana) {
        if (left.NrWytl === right.NrWytl) {
          return Number(left.Rodzaj || 0) - Number(right.Rodzaj || 0);
        }
        return Number(left.NrWytl || 0) - Number(right.NrWytl || 0);
      }
      return String(left.Zmiana).localeCompare(String(right.Zmiana));
    }
    return String(right.Data).localeCompare(String(left.Data));
  });

  return paginate(filtered, params.page || 1, Math.max(1, Number(params.page_size) || 25));
};

const calculateCalculatorResult = (form) => {
  const szerRekawa = parseNumber(form.SzerRekawa);
  const szerWorka = parseNumber(form.SzerWorka);
  const ilosc = parseNumber(form.IloscZlec);
  const dlugWorka = parseNumber(form.DlugWorka);
  const grubWorka = parseNumber(form.GrubWorka);
  const tasma = Boolean(form.Tasma);
  const zakladka = (szerRekawa - szerWorka) / 2;
  const dlugFoliPlan = (ilosc * dlugWorka) / 1000;
  const effectiveFoilLength = resolveEffectiveFoilLength(dlugFoliPlan, form.DlugFoilPlan_Korekta);
  const baseWeight = (szerRekawa / 1000) * (grubWorka / 1000) * effectiveFoilLength * 2 * 0.95;
  const wagaFoliZlec = tasma ? baseWeight / 2 : baseWeight;

  return {
    Zakladka: toFixedNumber(zakladka),
    DlugFoliPlan: toFixedNumber(dlugFoliPlan),
    WagaFoliZlec: toFixedNumber(wagaFoliZlec),
  };
};

const pickUserByCredentials = ({ username }) => {
  const account = state.users.find((user) => user.username === username);
  if (!account) {
    return MOCK_USER;
  }
  return {
    ...MOCK_USER,
    ...account,
    permissions: MOCK_USER.permissions,
  };
};

const handleGet = (path, params) => {
  if (path === 'auth/me') {
    return { status: 200, data: MOCK_USER };
  }

  if (path === 'meta/orders') {
    return {
      status: 200,
      data: {
        status: STATUS_OPTIONS,
        priority: PRIORITY_OPTIONS,
        foil_types: FOIL_TYPE_OPTIONS,
      },
    };
  }

  if (path === 'home/summary') {
    return { status: 200, data: buildHomeSummary() };
  }

  if (path === 'orders') {
    const filtered = getFilteredOrders(params);
    const requestedPageSize = Math.max(1, Number(params.page_size) || 10);
    const paginated = paginate(withOrderLabels(filtered), params.page || 1, requestedPageSize);
    return { status: 200, data: paginated };
  }

  if (path === 'orders/legacy') {
    const filtered = getFilteredOrders(params);
    const requestedPageSize = Math.max(1, Number(params.page_size) || 15);
    return { status: 200, data: paginate(withOrderLabels(filtered), params.page || 1, requestedPageSize) };
  }

  if (path === 'orders/progress') {
    const values = Array.isArray(params.nrzp) ? params.nrzp : [params.nrzp];
    return { status: 200, data: { items: buildOrderProgressMap(values) } };
  }

  if (path === 'production/orders') {
    const active = state.orders.filter((order) => Number(order.Status) === 1);
    const requestedPageSize = Math.max(1, Number(params.page_size) || 15);
    return { status: 200, data: paginate(withOrderLabels(active), params.page || 1, requestedPageSize) };
  }

  if (path === 'users') {
    return { status: 200, data: deepClone(state.users) };
  }

  if (path === 'users/groups') {
    return { status: 200, data: { groups: GROUP_OPTIONS } };
  }

  if (path === 'reports/completed-production') {
    return { status: 200, data: buildCompletedProductionReport(params) };
  }

  if (path === 'reports/production') {
    return { status: 200, data: paginate(buildProductionReport(), params.page || 1, Math.max(1, Number(params.page_size) || 25)) };
  }

  if (path === 'reports/operator') {
    return { status: 200, data: paginate(buildOperatorReport(), params.page || 1, Math.max(1, Number(params.page_size) || 25)) };
  }

  if (path === 'reports/order-status') {
    return {
      status: 200,
      data: paginate(buildOrderStatusReport(), params.page || 1, Math.max(1, Number(params.page_size) || 25)),
    };
  }

  if (path === 'reports/workers') {
    return { status: 200, data: buildWorkersReport(params) };
  }

  const orderDetailsMatch = path.match(/^orders\/(\d+)$/);
  if (orderDetailsMatch) {
    const order = findOrderById(orderDetailsMatch[1]);
    return {
      status: 200,
      data: order ? makeOrder(order) : {},
    };
  }

  const productionRollsMatch = path.match(/^production\/orders\/(.+)\/rolls$/);
  if (productionRollsMatch) {
    const orderCode = decodeURIComponent(productionRollsMatch[1]);
    const rolls = state.rollsByOrder[orderCode] || [];
    return { status: 200, data: deepClone(rolls) };
  }

  const productionRollDetailMatch = path.match(/^production\/orders\/(.+)\/rolls\/(\d+)$/);
  if (productionRollDetailMatch) {
    const orderCode = decodeURIComponent(productionRollDetailMatch[1]);
    const rollId = Number(productionRollDetailMatch[2]);
    const roll = (state.rollsByOrder[orderCode] || []).find((item) => item.id === rollId);
    if (!roll) {
      return { status: 404, data: { detail: 'Not found' } };
    }
    return { status: 200, data: deepClone(roll) };
  }

  const productionSummaryMatch = path.match(/^production\/orders\/(.+)\/summary$/);
  if (productionSummaryMatch) {
    const orderCode = decodeURIComponent(productionSummaryMatch[1]);
    return { status: 200, data: calculateSummary(orderCode) };
  }

  return { status: 200, data: {} };
};

const handlePost = (path, payload) => {
  if (path === 'auth/login') {
    return {
      status: 200,
      data: {
        token: state.token,
        user: pickUserByCredentials(payload),
      },
    };
  }

  if (path === 'auth/logout') {
    return { status: 200, data: { ok: true } };
  }

  if (path === 'orders') {
    const newOrder = calculateOrderDerivedValues({
      ...payload,
      id: state.nextOrderId,
      NrZp: payload.NrZp || `${today.replace(/-/g, '')}/${1000 + state.nextOrderId}`,
      Data: payload.Data || today,
      Status: Number(payload.Status ?? 0),
      Priorytet: Number(payload.Priorytet ?? 1),
      Rodzaj: Number(payload.Rodzaj ?? 0),
      NrWytl: Number(payload.NrWytl ?? 0),
      Tasma: Boolean(payload.Tasma),
    });
    state.nextOrderId += 1;
    state.orders = [newOrder, ...state.orders];
    return { status: 201, data: makeOrder(newOrder) };
  }

  if (path === 'users') {
    const newUser = {
      id: state.nextUserId,
      username: payload.username || `user${state.nextUserId}`,
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      email: payload.email || '',
      phone_number: payload.phone_number || '',
      groups: payload.group ? [payload.group] : [],
    };
    state.nextUserId += 1;
    state.users = [...state.users, newUser];
    return { status: 201, data: newUser };
  }

  if (path === 'calculator') {
    return { status: 200, data: calculateCalculatorResult(payload) };
  }

  if (path === 'orders/progress') {
    const orderNumbers = Array.isArray(payload?.order_numbers) ? payload.order_numbers : [];
    return { status: 200, data: { items: buildOrderProgressMap(orderNumbers) } };
  }

  const statusUpdateMatch = path.match(/^orders\/(\d+)\/status$/);
  if (statusUpdateMatch) {
    const order = findOrderById(statusUpdateMatch[1]);
    if (order) {
      order.Status = Number(payload.status ?? order.Status);
    }
    return { status: 200, data: order ? makeOrder(order) : {} };
  }

  const copyOrderMatch = path.match(/^orders\/(\d+)\/copy$/);
  if (copyOrderMatch) {
    const order = findOrderById(copyOrderMatch[1]);
    if (!order) {
      return { status: 200, data: {} };
    }
    const copiedOrder = {
      ...order,
      id: state.nextOrderId,
      NrZp: `${order.NrZp}-COPY-${state.nextOrderId}`,
      Status: 0,
      Data: today,
    };
    state.nextOrderId += 1;
    state.orders = [copiedOrder, ...state.orders];
    return { status: 201, data: makeOrder(copiedOrder) };
  }

  const addRollMatch = path.match(/^production\/orders\/(.+)\/rolls$/);
  if (addRollMatch) {
    const orderCode = decodeURIComponent(addRollMatch[1]);
    const orderRolls = state.rollsByOrder[orderCode] || [];
    const newRoll = {
      ...payload,
      id: state.nextRollId,
      Rolka: Number(payload.Rolka || orderRolls.length + 1),
      UserName: payload.UserName || 'operator1',
      Data: payload.Data || today,
    };
    state.nextRollId += 1;
    state.rollsByOrder[orderCode] = [...orderRolls, newRoll];
    return { status: 201, data: newRoll };
  }

  return { status: 200, data: {} };
};

const handlePut = (path, payload) => {
  const orderDetailsMatch = path.match(/^orders\/(\d+)$/);
  if (orderDetailsMatch) {
    const order = findOrderById(orderDetailsMatch[1]);
    if (order) {
      Object.assign(order, calculateOrderDerivedValues({ ...order, ...payload }));
    }
    return { status: 200, data: order ? makeOrder(order) : {} };
  }

  const productionRollDetailMatch = path.match(/^production\/orders\/(.+)\/rolls\/(\d+)$/);
  if (productionRollDetailMatch) {
    const orderCode = decodeURIComponent(productionRollDetailMatch[1]);
    const rollId = Number(productionRollDetailMatch[2]);
    const orderRolls = state.rollsByOrder[orderCode] || [];
    const rollIndex = orderRolls.findIndex((item) => item.id === rollId);
    if (rollIndex === -1) {
      return { status: 404, data: { detail: 'Not found' } };
    }

    const currentRoll = orderRolls[rollIndex];
    const updatedRoll = {
      ...currentRoll,
      ...payload,
      id: currentRoll.id,
      Rolka: currentRoll.Rolka,
      UserName: currentRoll.UserName || 'operator1',
      Data: payload.Data || currentRoll.Data || today,
    };
    state.rollsByOrder[orderCode] = [
      ...orderRolls.slice(0, rollIndex),
      updatedRoll,
      ...orderRolls.slice(rollIndex + 1),
    ];
    return { status: 200, data: deepClone(updatedRoll) };
  }
  return { status: 200, data: {} };
};

const handlePatch = (path, payload) => {
  const userMatch = path.match(/^users\/(\d+)$/);
  if (userMatch) {
    const user = state.users.find((entry) => entry.id === Number(userMatch[1]));
    if (user) {
      const nextGroup =
        payload.group === null || payload.group === undefined || payload.group === ''
          ? []
          : [payload.group];
      Object.assign(user, {
        first_name: payload.first_name ?? user.first_name,
        last_name: payload.last_name ?? user.last_name,
        email: payload.email ?? user.email,
        phone_number: payload.phone_number ?? user.phone_number,
        groups: nextGroup,
      });
    }
    return { status: 200, data: user || {} };
  }
  return { status: 200, data: {} };
};

const handleDelete = (path) => {
  const userMatch = path.match(/^users\/(\d+)$/);
  if (userMatch) {
    state.users = state.users.filter((entry) => entry.id !== Number(userMatch[1]));
    return { status: 204, data: null };
  }
  return { status: 204, data: null };
};

const handleMockRequest = (config) => {
  const method = String(config.method || 'get').toLowerCase();
  const path = normalizePath(config.url);
  const params = config.params || {};
  const payload = parsePayload(config.data);

  if (method === 'get') {
    return handleGet(path, params);
  }
  if (method === 'post') {
    return handlePost(path, payload);
  }
  if (method === 'put') {
    return handlePut(path, payload);
  }
  if (method === 'patch') {
    return handlePatch(path, payload);
  }
  if (method === 'delete') {
    return handleDelete(path);
  }
  return { status: 200, data: {} };
};

export const createMockAdapter = () => async (config) => {
  const { status, data } = handleMockRequest(config);
  return {
    data: deepClone(data),
    status,
    statusText: status >= 400 ? 'Error' : 'OK',
    headers: {},
    config,
    request: { mock: true },
  };
};
