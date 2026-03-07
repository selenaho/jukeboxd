// one time ingestion script to populate the db with artist/album/song data from spotify api

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

axios.defaults.timeout = 15000; // 15 seconds

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// load artists from artists.txt
const artists = fs.readFileSync('artists.txt', 'utf-8').split('\n').map(s => s.trim()).filter(Boolean);

async function getSpotifyAccessToken() {
  const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
}

async function fetchArtistData(artistName, accessToken) {
  try {
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: artistName,
        type: 'artist',
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const artist = searchResponse.data.artists.items[0];

    if (!artist) return null;

    return artist;
  } catch (error) {
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

async function fetchAlbumsForArtist(artistId, accessToken) {
  const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
    params: {
      include_groups: 'album',
      limit: 50,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return albumsResponse.data.items;
}

async function fetchTracksForAlbum(albumId, accessToken) {
  const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
    params: {
      limit: 50,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return tracksResponse.data.items;
}

// helper function because spotify api keeps giving ETIMEDOUT errors so retrying request a few times before giving up on it
async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (error === "ETIMEDOUT" && retries > 0) {
      console.warn(`Error occurred, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      return retry(fn, retries - 1, delay * 2); // exponential backoff
    } else {
      throw error;
    }
  }
}

async function run() {
  const accessToken = await getSpotifyAccessToken();
  //process each of the artists in our artists.txt
  for (const artistName of artists) {
    try {
      console.log('Processing artist:', artistName);
      const artistData = await retry(() => fetchArtistData(artistName, accessToken));
      if (!artistData) {
        console.log(`Artist not found: ${artistName}`);
        continue;
      }
      await supabase.from("Artist").upsert({
        artist_id: artistData.id,
        artist_name: artistData.name
      });
      const albums = await retry(() => fetchAlbumsForArtist(artistData.id, accessToken));
      //then each of the albums for that artist
      for (const album of albums) {
        await supabase.from("Album").upsert({
          album_id: album.id,
          album_name: album.name,
          album_release_date: album.release_date,
          album_art_url: album.images[2]?.url || album.images[1]?.url || album.images[0]?.url || null // prioritizing the smaller images first rather than the larger ones bc this is mobile app
        });

        await supabase.from("AlbumArtist").upsert({
          album_id: album.id,
          artist_id: artistData.id
        });

        //and then each of the songs for that album
        const tracks = await retry(() => fetchTracksForAlbum(album.id, accessToken));
        for (const track of tracks) {
          await supabase.from("Song").upsert({
            song_id: track.id,
            song_title: track.name 
          });

          await supabase.from("SongAlbum").upsert({
            song_id: track.id,
            album_id: album.id
          });
        }
      }
  } catch (error) {
      console.error(`Error processing artist ${artistName}:`, error);
    }
    await new Promise(r => setTimeout(r, 200)); // getting timed out errors w spotify api, adding small delay between each artist to try to fix
  }
  console.log("Done!");
}

run();