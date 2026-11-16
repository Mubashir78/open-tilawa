# Microsoft Edge Add-ons — fields

Edge takes the **same package as Chrome**. Upload `tilawah-companion-0.2.0-chrome.zip`
unchanged; the add-ons store validates it as a Chromium MV3 extension. There is no
Edge-specific build and no Edge-specific permission.

| Field | Value |
| --- | --- |
| **Name** | `Tilawah Companion` |
| **Short description** (≤132) | `Holds the recitations you choose and shares them with Tilawa listeners while your browser runs.` |
| **Long description** | `store/listing-en.md` → Long description (Arabic: `store/listing-ar.md`) |
| **Category** | Productivity |
| **Privacy policy URL** | `https://adelpro.us.kg/open-tilawa/privacy.html` |
| **Support contact** | `contact@tilawah.cc` |
| **Website** | `https://tilawah.cc` |
| **Screenshots** (1280×800) | `store/screens/branded/01.png` … `04.png` |
| **Small promotional image** (440×280) | `store/screens/promo-light-440x280.png` |
| **Logo / store icon** (128×128) | `store/icon-128.png` |

## Data and permissions (Edge's forms)

Edge asks the same two things Chrome does, in different words:

**Permissions justification** — one line each:

| Permission | Justification |
| --- | --- |
| `storage`, `unlimitedStorage` | keeps the recitations the user chose and their settings; one recitation is larger than a website's storage allowance |
| `alarms` | one daily check of the public catalogue, plus the badge refresh |
| `notifications` | tells the user when the catalogue publishes a new reciter |
| `offscreen` | hosts the WebRTC seed engine so sharing survives the service worker being evicted |
| `https://console.tilawah.cc/*` | reads the public recitation list; no user data is sent |
| `https://tilawah.cc/*` | downloads the chosen recitation's `.torrent` and audio |

**Data collection** — *does this extension collect personal data?* **No.** No account,
no identifier, no analytics, no page or tab access. Nothing is sent to a server of ours.

## Reviewer notes

> To test: open the extension options, tick the smallest recitation (`عبدالعزيز سحيم`,
> 118 MB), press **ابدأ المشاركة**. It downloads from `tilawah.cc/media/` and starts
> seeding over WebRTC; `tracker.tilawah.cc/stats` then counts one more seeder.
