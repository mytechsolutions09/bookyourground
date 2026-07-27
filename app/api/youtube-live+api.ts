import { supabase } from '@/lib/supabase';
import { YOUTUBE_RTMP_URL, extractYouTubeVideoId } from '@/lib/youtube';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, accessToken, matchTitle, directUrl } = body;

    if (!matchId) {
      return Response.json({ error: 'matchId is required' }, { status: 400 });
    }

    // ── Tier 1 Fallback: Direct YouTube URL pasted ──────────────────────────
    if (directUrl) {
      const videoId = extractYouTubeVideoId(directUrl);
      if (!videoId) {
        return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }

      const { error: dbErr } = await supabase
        .from('matches')
        .update({
          youtube_stream_url: directUrl,
          youtube_video_id: videoId,
          stream_started_at: new Date().toISOString(),
          status: 'live',
        })
        .eq('id', matchId);

      if (dbErr) {
        return Response.json({ error: dbErr.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        videoId,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        message: 'Direct YouTube link associated successfully',
      });
    }

    // ── Tier 2: YouTube Data API v3 Auto-Creation ───────────────────────────
    if (!accessToken) {
      return Response.json(
        { error: 'Google Access Token is required for auto-creation' },
        { status: 401 }
      );
    }

    const title = matchTitle || 'Live Cricket Match — BookYourGround';

    // Step 1: Create Broadcast
    const broadcastRes = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title,
            scheduledStartTime: new Date().toISOString(),
            description: 'Live broadcast powered by BookYourGround',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
          },
        }),
      }
    );

    if (!broadcastRes.ok) {
      const errData = await broadcastRes.json();
      console.error('YouTube API Broadcast Error:', errData);
      return Response.json(
        { error: errData.error?.message || 'Failed to create YouTube broadcast' },
        { status: broadcastRes.status }
      );
    }

    const broadcastData = await broadcastRes.json();
    const broadcastId = broadcastData.id;

    // Step 2: Create Stream
    const streamRes = await fetch(
      'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: `${title} Stream`,
          },
          cdn: {
            ingestionType: 'rtmp',
            resolution: '1080p',
            frameRate: '30fps',
          },
        }),
      }
    );

    if (!streamRes.ok) {
      const errData = await streamRes.json();
      console.error('YouTube API Stream Error:', errData);
      return Response.json(
        { error: errData.error?.message || 'Failed to create YouTube stream key' },
        { status: streamRes.status }
      );
    }

    const streamData = await streamRes.json();
    const streamId = streamData.id;
    const streamName = streamData.cdn?.ingestionInfo?.streamName;
    const rtmpUrl = streamData.cdn?.ingestionInfo?.ingestionAddress || YOUTUBE_RTMP_URL;

    // Step 3: Bind Broadcast & Stream
    const bindRes = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=id,snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!bindRes.ok) {
      const errData = await bindRes.json();
      console.error('YouTube API Bind Error:', errData);
    }

    const watchUrl = `https://www.youtube.com/watch?v=${broadcastId}`;

    // Step 4: Save to Supabase matches table
    const { error: dbErr } = await supabase
      .from('matches')
      .update({
        youtube_video_id: broadcastId,
        youtube_stream_url: watchUrl,
        youtube_stream_key: streamName,
        youtube_rtmp_url: rtmpUrl,
        stream_started_at: new Date().toISOString(),
        status: 'live',
      })
      .eq('id', matchId);

    if (dbErr) {
      console.error('Database update error:', dbErr);
    }

    return Response.json({
      success: true,
      videoId: broadcastId,
      streamKey: streamName,
      rtmpUrl,
      watchUrl,
    });
  } catch (error: any) {
    console.error('API Error in /api/youtube-live:', error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
