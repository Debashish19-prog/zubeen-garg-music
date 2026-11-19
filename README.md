# Zubeen · every song, one player

A fan-made music player dedicated to **Zubeen Garg** (1972–2025), the voice of Assam. It gathers more
than five thousand of his songs into one place, with a streaming-app interface that works on desktop
and mobile.

**5,267 songs** · **2,423 albums and films** · **22 languages** · **4,012 songs play in full**

## About Zubeen Garg

Zubeen Garg, born Zubeen Borthakur on 18 November 1972 in Tura, Meghalaya, was a singer, composer,
lyricist, actor and filmmaker, and the most beloved voice Assam has known. He released his first
Assamese album, *Anamika*, in 1992. Over the next three decades he sang in more than forty languages
and dialects. Across India he was known for "Ya Ali" from *Gangster* (2006). In Assam he was
everywhere: on the Bihu stage, in mobile theatre, in films and in everyday life. He died on
19 September 2025 in Singapore, where he had travelled to perform.

This project is a tribute: a way to find, listen to and remember his work.

## What you can do

- **Browse the whole catalogue**: by album and film, language, decade, or the people he worked with
  (co-singers, composers and lyricists).
- **Search the way people type**: search is spelling-tolerant, so *Xun*, *Hun* and *Shun* all find
  the same song.
- **Listen**: a full player with a queue, shuffle, repeat, a Now Playing panel, a fullscreen view, a
  floating mini player and lock-screen controls.
- **Build your library**: like songs, make playlists and pick up where you left off.
- **Read his story**: the About page is a tribute with photos and a timeline of his life.
- **Upload your own copies** (site owner only): audio files you own can be added, stored privately in
  Telegram and streamed in full.

## How the songs play

The site does not host or download any catalogue music. Each song plays through an official source:

1. **YouTube**: the official upload from his labels' channels, or another embeddable upload that
   credits him.
2. **Apple Music**: 30-second previews.
3. **Spotify** and **JioSaavn**: their embedded players.

If one source fails, the player moves to the next one automatically. When a song can't be embedded,
the site links to it instead. All recordings and videos remain the property of their rights holders.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/Debashish19-prog/zubeen-garg-music.git
cd zubeen-garg-music
npm install
npm run dev
```

Then open **http://localhost:8765**. Use `localhost`, not `127.0.0.1`: YouTube refuses to play most
label videos when the page is opened from an IP address.

For a production build, run `npm run build` and then `npm start`.

## Configuration

Everything is optional. Without any settings, the catalogue and the player work fully. To turn on
the extras, copy `.env.example` to `.env.local` and fill in what you need:

| Variable | What it does |
| --- | --- |
| `YOUTUBE_API_KEY` | A YouTube Data API v3 key. Songs that only have a preview are matched to a full-length YouTube video when they are played. |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | App credentials from [my.telegram.org](https://my.telegram.org). They turn on uploads, which are stored in a private channel in your Telegram account. |
| `OWNER_PASSWORD` | Requires a password (6+ characters) before anyone can upload. **Set this on any public deployment.** |

`.env.local` and `data/telegram.json` (the Telegram sign-in session) contain secrets. Both are
ignored by git, so keep them that way.

## Built with

- [Next.js 15](https://nextjs.org) (App Router) and React 19: the pages and the backend API routes
- [Tailwind CSS 4](https://tailwindcss.com): styling
- [Motion](https://motion.dev): page transitions, gestures and animated artwork
- [Zustand](https://zustand.docs.pmnd.rs): player, library and interface state
- [sharp](https://sharp.pixelplumbing.com): picks the colour of each album cover for the page headers
- [GramJS](https://gram.js.org): Telegram storage for uploads

```
app/          pages and api/ routes
components/   player, layout shell, song lists, upload dialog, page views
lib/          catalogue search, Telegram storage, library store, shared helpers
store/        player, library and UI state
data/         catalog.json (every song and album) and photos.json
public/       icon and photos
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Ctrl/⌘ + ← / → | Previous / next song |
| Shift + ← / → | Seek 5 seconds |
| M | Mute |
| L | Like the current song |
| F | Fullscreen player |
| / or Ctrl/⌘ + K | Search |

## Known limitations

- **Saved data lives on the server's disk.** Liked songs, playlists, history and the uploads list are
  saved as files in `data/`. That works when you run the site on your own computer, but serverless
  hosts such as Vercel don't keep files, so those features need a database before such a deployment.
  The library is also shared by everyone who uses one server.
- **Listen-only mode is for personal use.** The button that hides the YouTube video while the song keeps
  playing goes against YouTube's API terms, which don't allow audio-only playback. Remove it before
  the site goes public.

## Credits and disclaimer

This is a non-commercial fan project. It is not affiliated with Zubeen Garg's family, his record
labels, or any streaming service.

The song information was compiled from Wikipedia, MusicBrainz, JioSaavn, Apple Music and YouTube.
Photos belong to their photographers; each one is credited, with its source, on the site's About page.
