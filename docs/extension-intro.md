# Tilawah Companion — what it is

A browser extension that keeps the Qur'an recitations you choose and shares them
with Tilawa listeners, while the browser runs.

**Why it exists.** Tilawa streams from one server and from other listeners'
browsers. A browser can only swap pieces with another browser over WebRTC, so
listeners are the only peers that can help each other — and the tracker shows how
thin that swarm is. A seeder node helps, but it needs Docker and a machine that
stays on. This is the middle: one click, no daemon, no tab left open.

**What it asks.** Disk and part of your upload, both capped by you — how many
reciters (two by default), the upload rate (1 Mbps), and the hours it may run.
Nothing is pre-ticked, and a new reciter is a notification, not a download.

**What it never does.** No account, no persistent identifier, no analytics, no
reading of pages, tabs or history. It contacts two hosts: the public catalogue
once a day, and the site's torrent files and audio when you download a reciter.

**Status.** 0.2.0, tested by probe on Chrome; Firefox builds and audits but has
not been run on hardware. Store listings are prepared, not submitted.
