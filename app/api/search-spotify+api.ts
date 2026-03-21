import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // using service role key to bypass RLS
);

// Get Spotify access token via client credentials flow
async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

async function handleSong(name: string, token: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const track = data.tracks?.items?.[0];
  if (!track) throw new Error(`No song found for "${name}"`);

  // Upsert song
  await supabase.from("Song").upsert({
    song_id: track.id,
    song_title: track.name,
  });

  // Upsert artists and link
  for (const artist of track.artists) {
    await supabase.from("Artist").upsert({
      artist_id: artist.id,
      artist_name: artist.name,
    });
    await supabase.from("SongArtist").upsert({
      song_id: track.id,
      artist_id: artist.id,
    });
  }

  // Upsert album and link
  const album = track.album;
  await supabase.from("Album").upsert({
    album_id: album.id,
    album_name: album.name,
    album_art_url: album.images?.[1]?.url || album.images?.[0]?.url || null,
    album_release_date: album.release_date,
  });
  await supabase.from("SongAlbum").upsert({
    song_id: track.id,
    album_id: album.id,
  });

  return track.name;
}

async function handleAlbum(name: string, token: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=album&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const album = data.albums?.items?.[0];
  if (!album) throw new Error(`No album found for "${name}"`);

  await supabase.from("Album").upsert({
    album_id: album.id,
    album_name: album.name,
    album_art_url: album.images?.[1]?.url || album.images?.[0]?.url || null,
    album_release_date: album.release_date,
  });

  for (const artist of album.artists) {
    await supabase.from("Artist").upsert({
      artist_id: artist.id,
      artist_name: artist.name,
    });
    await supabase.from("AlbumArtist").upsert({
      album_id: album.id,
      artist_id: artist.id,
    });
  }

  // Fetch full album to get tracks
  const albumRes = await fetch(
    `https://api.spotify.com/v1/albums/${album.id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const albumData = await albumRes.json();

  for (const track of albumData.tracks?.items || []) {
    await supabase.from("Song").upsert({
      song_id: track.id,
      song_title: track.name,
    });
    await supabase.from("SongAlbum").upsert({
      song_id: track.id,
      album_id: album.id,
    });
    for (const artist of track.artists) {
      await supabase.from("Artist").upsert({
        artist_id: artist.id,
        artist_name: artist.name,
      });
      await supabase.from("SongArtist").upsert({
        song_id: track.id,
        artist_id: artist.id,
      });
    }
  }

  return album.name;
}

async function handleArtist(name: string, token: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const artist = data.artists?.items?.[0];
  if (!artist) throw new Error(`No artist found for "${name}"`);

  await supabase.from("Artist").upsert({
    artist_id: artist.id,
    artist_name: artist.name,
  });

  // Fetch artist's top albums
  const albumsRes = await fetch(
    `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const albumsData = await albumsRes.json();

  for (const album of albumsData.items || []) {
    await supabase.from("Album").upsert({
      album_id: album.id,
      album_name: album.name,
      album_art_url: album.images?.[1]?.url || album.images?.[0]?.url || null,
      album_release_date: album.release_date,
    });
    await supabase.from("AlbumArtist").upsert({
      album_id: album.id,
      artist_id: artist.id,
    });

    // Then also fetch tracks for each album to link artist to songs
    const albumRes = await fetch(
      `https://api.spotify.com/v1/albums/${album.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const albumTracks = await albumRes.json();
    for (const track of albumTracks.tracks?.items || []) {
      await supabase.from("Song").upsert({
        song_id: track.id,
        song_title: track.name,
      });
      await supabase.from("SongAlbum").upsert({
        song_id: track.id,
        album_id: album.id,
      });
      // make sure that mutliple artists per track are taken into account
      for (const trackArtist of track.artists) {
        await supabase.from("Artist").upsert({
          artist_id: trackArtist.id,
          artist_name: trackArtist.name,
        });
        await supabase.from("SongArtist").upsert({
          song_id: track.id,
          artist_id: trackArtist.id,
        });
      }
    }
  }

  return artist.name;
}

export async function POST(request: Request) {
  try {
    const { type, name } = await request.json();

    if (!type || !name) {
      return Response.json({ error: "type and name are required" }, { status: 400 });
    }

    const token = await getSpotifyToken();
    let addedName: string;

    if (type === "Song") addedName = await handleSong(name, token);
    else if (type === "Album") addedName = await handleAlbum(name, token);
    else if (type === "Artist") addedName = await handleArtist(name, token);
    else return Response.json({ error: "Invalid type" }, { status: 400 });

    return Response.json({ success: true, name: addedName });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}