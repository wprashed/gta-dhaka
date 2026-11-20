# DHAKA CITY: MONSOON UNDERWORLD (ঢাকা সিটি) — 3D Open-World Action Game

> **🎮 Live Playable Game:** [https://wprashed.github.io/gta-dhaka/](https://wprashed.github.io/gta-dhaka/)  
> **📦 GitHub Repository:** [https://github.com/wprashed/gta-dhaka](https://github.com/wprashed/gta-dhaka)

An original, real-time 3D browser-based open-world action-adventure game set in a fictionalized, modern-day **Dhaka, Bangladesh** built with Three.js, React, TypeScript, Tailwind CSS, and WebGL.

---

## 1. Core Features & Playable Systems

### 🏙️ 10 Interconnected Dhaka Districts
1. **Farmgate & Karwan Bazar (`ফার্মগেট ও কারওয়ান বাজার`)** — Central crossroads, MRT Metro Rail viaduct pillars, Tong Cha stalls, traffic police box, and Arif's Safe House.
2. **Old Dhaka / Puran Dhaka (`পুরান ঢাকা`)** — Narrow heritage alleys, colorful cycle rickshaws, Star Mosque (Tara Masjid), and Shahi Haji Kacchi Biriyani.
3. **Sadarghat River Port (`সদরঘাট লঞ্চ টার্মিনাল`)** — Buriganga riverfront embankment, pontoons, and docked triple-decker passenger launches.
4. **Dhanmondi Lakeside (`ধানমন্ডি লেক`)** — Tree-lined residential roads, Krishnachura flame trees, lakeside promenade, and Naga Fuchka & Chotpoti carts.
5. **Motijheel Commercial Hub (`মতিঝিল বাণিজ্যিক এলাকা`)** — Financial skyscrapers, Padma Commerce Bank towers, and the iconic **Shapla Chattar** (Water Lily) monument.
6. **Hatirjheel Lakefront (`হাতিরঝিল লেক ও ফ্লাইওভার`)** — Sweeping lakeside causeways and Dhaka's iconic neon color-lit arch bridge.
7. **Gulshan Avenue (`গুলশান এভিনিউ`)** — Modern glass corporate towers, diplomatic enclaves, and luxury sedans.
8. **Banani Road 11 (`বনানী রোড ১১`)** — Boutique fashion houses, cafés, and vibrant urban nightlife.
9. **Uttara Model Town (`উত্তরা মডেল টাউন`)** — Wide planned boulevards, residential sectors, and northern metro corridor.
10. **Airport Road & Flyover (`এয়ারপোর্ট রোড`)** — Northern high-speed expressway leading toward Hazrat Shahjalal International Airport.

### 🛺 7 Drivable Bangladeshi Vehicles
- **Dhaka CNG Auto-Rickshaw (`সিএনজি অটোরিকশা`)** — Forest-green 3-wheeler with Dhaka's signature protective wire-mesh security cage, yellow bumper stripes, and 2-stroke/4-stroke engine sound.
- **Painted Cycle Rickshaw (`প্যাডেল রিকশা`)** — Traditional Bangladeshi folk-art hood (`মায়ের দোয়া`), floral cushions, tight turning radius, and authentic double-chime brass bell (`[H]`).
- **Bihanga Express Local Bus (`লোকাল বাস`)** — Heavy transit bus with Bangla route boards and multi-tone brass air horn.
- **Dhaka 150cc Street Motorcycle (`মোটরসাইকেল`)** — High-acceleration commuter bike built for weaving through Farmgate traffic.
- **Gulshan Executive Sedan (`প্রাইভেট কার`)** — Fast cruising speed and handbrake drifting (`[Space]`).
- **Karwan Bazar Cargo Pickup (`কার্গো পিকআপ`)** — Heavy-duty commercial utility truck.
- **DMP Rapid Patrol Pickup (`পুলিশ পেট্রোল ভ্যান`)** — Flashing red/blue roof lightbars and pursuit siren.

### 🕵️‍♂️ 5-Chapter Original Storyline + Side Hustles
- **Protagonist:** **Arif Rahman** (Age 27), returning to Farmgate after his brother Rafiq vanishes while investigating river-port extortion by Chairman Sikder's Syndicate.
- **Chapter 1: Back to Dhaka** — *Homecoming at Farmgate*
- **Chapter 2: The City Never Sleeps** — *Old Dhaka Spice & Shadows*
- **Chapter 3: Business and Betrayal** — *Motijheel Courier & Moral Crossroads* (Branching player choice)
- **Chapter 4: The Underworld** — *Heat on Hatirjheel* (Level 3 DMP Police Pursuit & Evasion)
- **Chapter 5: The Final Deal** — *Reckoning at Sadarghat* (Multiple endings based on player decisions)
- **Repeatable Side Activities:** *Airport Express CNG Fare*, *Dhanmondi Naga Fuchka Delivery*, and *Hatirjheel Neon Bridge Street Race*.

---

## 2. Controls Reference

| Key / Input | Action |
| :--- | :--- |
| **`W, A, S, D`** or **Arrow Keys** | Walk, Run, Steer & Accelerate/Reverse Vehicles |
| **`Left Shift`** (Hold) | Sprint (On Foot) |
| **`F`** or **`E`** | Enter / Exit Vehicle, Buy Street Food (Cha, Fuchka, Biriyani), Use Safe House |
| **`H`** | Honk Vehicle Horn or Ring Cycle Rickshaw Bell (`Tring-Tring!`) |
| **`Spacebar`** | Jump (On Foot) / Handbrake Drift (In Vehicle) |
| **`C`** | Toggle Crouch (On Foot) |
| **`T`** | Talk to Nearby NPCs & Story Contacts |
| **`J`** or **`K`** | Melee Attack / Swing Cricket Bat, Bamboo Lathi, or Shock Baton |
| **Mouse Drag** | Orbit 360° Third-Person Camera |
| **`V`** | Cycle Camera Distance (Standard 3rd-Person, Far Chase, Close Action) |
| **`R`** | Cycle Bangladeshi FM Radio Stations (`98.4 Folk`, `101.2 Gully`, `105.6 Synth`, `Off`) |
| **`M`** or **`ESC`** | Open Interactive Dhaka GPS Map, Missions, Garage, Wardrobe & Settings |

---

## 3. Technical Stack

- **3D Engine:** Three.js (`WebGLRenderer`, PCFSoftShadowMap, procedural CanvasTextures with Bangla typography & Rickshaw folk art, Monsoon Rain particle system, day/night lighting).
- **UI & State Layer:** React 18, TypeScript, Tailwind CSS, Zustand (`useGameStore`), Lucide Icons.
- **Audio Engine:** Procedural Web Audio API synthesizer (`dhakaAudioEngine.ts`) generating real-time engine pitch modulation, cycle rickshaw bells, bus air horns, police sirens, monsoon rain noise, and 3 original Bangladeshi FM radio station sequencers.
