# Store fields — copy and paste

Both stores: Arabic first, then the English twin. The Arabic below was gated through uslub (voice-adel); re-gate if you edit it.

---

## Chrome Web Store

| Field | Value |
| --- | --- |
| **Name** (≤75) | `Tilawah Companion` |
| **Summary** (≤132) | `Holds the recitations you choose and shares them with Tilawa listeners while your browser runs.` |
| **Category** | **Productivity** (Education is the only credible alternative; Productivity describes a background tool) |
| **Language** | Arabic, then English (submit both listings) |
| **Detailed description** | `store/listing-en.md` → Long description (Arabic: `store/listing-ar.md`) |
| **Privacy policy URL** | `https://adelpro.github.io/open-tilawa/privacy.html` |
| **Terms URL** (if asked) | `https://adelpro.github.io/open-tilawa/terms.html` |
| **Support / contact** | `contact@tilawah.cc` |
| **Homepage** | `https://tilawah.cc` |
| **Screenshots** (1280×800) | `store/screens/{welcome,reciters,settings,about}-1280x800.png` |
| **Small promo tile** (440×280) | `store/screens/promo-440x280.png` |
| **Marquee** (1400×560, optional) | `store/screens/marquee-1400x560.png` |
| **Store icon** (128×128) | `store/icon-128.png` |

### Single purpose

> To hold recitations the user selects and seed them to Tilawa listeners over WebRTC.

### Host permission justifications (required, one per row)

| Host | Justification |
| --- | --- |
| `https://console.tilawah.cc/*` | Reads the public list of published recitations, once a day, to let the user choose what to keep. No user data is sent. |
| `https://tilawah.cc/*` | Downloads the `.torrent` file of a recitation the user chose and its audio from the site's published web seed. |

### Remote code

> No. All code ships inside the package; the WebTorrent client is the site's own published browser bundle, included in the zip.

### Privacy practices questionnaire

| Question | Answer | Why |
| --- | --- | --- |
| Personally identifiable information | **No** | no account, no email, no name |
| Health information | No | — |
| Financial and payment information | No | — |
| Authentication information | No | — |
| Personal communications | No | — |
| Location | No | — |
| Web history | **No** | no `tabs`, no `history`, no content scripts |
| User activity | No | no analytics, no clicks, no keystrokes |
| Website content | **No** | it reads a public JSON API, not the pages the user visits |
| Sold to third parties | **No** (certify) | — |
| Used for unrelated purposes | **No** (certify) | — |
| Used for creditworthiness | **No** (certify) | — |

---

## Firefox AMO

| Field | Value |
| --- | --- |
| **Name** (≤50) | `Tilawah Companion` |
| **Summary** (≤250) | `Holds the Qur'an recitations you choose and shares them with Tilawa listeners over WebRTC while your browser runs. No account, no analytics, and you set the disk and upload limits.` |
| **Categories** | **Productivity**, second choice **Other** |
| **Tags** | `quran`, `recitations`, `seeding`, `webtorrent`, `privacy` |
| **Description** | `store/listing-en.md` (Arabic: `store/listing-ar.md`) |
| **Homepage** | `https://tilawah.cc` |
| **Support email** | `contact@tilawah.cc` |
| **Privacy policy** | `https://adelpro.github.io/open-tilawa/privacy.html` |
| **License** | the repository's own license (MIT if `LICENSE` says so) |
| **Screenshots** | the four 1280×800 cards, same as Chrome |
| **Icon** | `store/icon-128.png` |

### Data collection (AMO's consent panel)

> **None of the above.** The extension collects nothing: no identifiers, no analytics, no crash reports. It does not read pages or tabs.

### Reviewer notes

> To test: open the extension options, tick the smallest recitation (`عبدالعزيز سحيم`, 118 MB), press **ابدأ المشاركة**. It downloads from `https://tilawah.cc/media/` and starts seeding; the tracker at `tracker.tilawah.cc` then counts one more peer. Network calls: the catalogue at `console.tilawah.cc`, the torrent and audio at `tilawah.cc`, and the WebSocket trackers listed inside each `.torrent` (Tilawa's own plus three public trackers the site has always shipped).

---

## What the extension actually contacts

| Host | When | Why |
| --- | --- | --- |
| `console.tilawah.cc` | once a day | public recitation list |
| `tilawah.cc` | only when a chosen recitation needs bytes | `.torrent` file and `/media/` audio |
| `wss://tracker.tilawah.cc` | while seeding | announces this browser as a peer |
| three public `wss://` trackers from the torrent's announce list | while seeding | fallback discovery; they see the same per-session peer id |

No other host is contacted. There is no backend of ours that receives anything.
