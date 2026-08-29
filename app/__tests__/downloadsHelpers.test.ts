/**
 * Unit tests for the pure HLS playlist helpers in services/downloads.ts.
 */
import {
  resolveUrl,
  parseMasterPlaylist,
  pickVariant,
  parseMediaPlaylist,
  buildLocalPlaylist,
} from '../services/downloads';

describe('resolveUrl', () => {
  it('returns absolute URLs untouched', () => {
    expect(resolveUrl('https://cdn.example/a/index.m3u8', 'https://other.example/x.ts')).toBe(
      'https://other.example/x.ts',
    );
  });

  it('handles protocol-relative URLs', () => {
    expect(resolveUrl('https://cdn.example/a/index.m3u8', '//cdn.example/x.ts')).toBe(
      'https://cdn.example/x.ts',
    );
  });

  it('handles root-relative URLs', () => {
    expect(resolveUrl('https://cdn.example/a/index.m3u8', '/root/x.ts')).toBe(
      'https://cdn.example/root/x.ts',
    );
  });

  it('resolves relative URLs against the playlist directory', () => {
    expect(resolveUrl('https://cdn.example/a/index.m3u8', 'seg.ts')).toBe(
      'https://cdn.example/a/seg.ts',
    );
    expect(resolveUrl('https://cdn.example/a/b/index.m3u8', '../seg.ts')).toBe(
      'https://cdn.example/a/seg.ts',
    );
  });

  it('strips query strings from the base URL', () => {
    expect(resolveUrl('https://cdn.example/a/index.m3u8?token=1', 'seg.ts')).toBe(
      'https://cdn.example/a/seg.ts',
    );
  });
});

describe('parseMasterPlaylist', () => {
  it('parses variants with bandwidth and resolution', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1920x1080',
      'high.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=640000,RESOLUTION=720x480',
      'low.m3u8',
    ].join('\n');

    const variants = parseMasterPlaylist(playlist, 'https://cdn.example/main.m3u8');
    expect(variants).toEqual([
      { bandwidth: 1280000, resolution: '1920x1080', url: 'https://cdn.example/high.m3u8' },
      { bandwidth: 640000, resolution: '720x480', url: 'https://cdn.example/low.m3u8' },
    ]);
  });

  it('returns an empty array for a media playlist', () => {
    const playlist = ['#EXTM3U', '#EXTINF:10.0,', 'seg0.ts'].join('\n');
    expect(parseMasterPlaylist(playlist, 'https://cdn.example/main.m3u8')).toEqual([]);
  });
});

describe('pickVariant', () => {
  const variants = [
    { bandwidth: 500000, resolution: '640x360', url: 'a.m3u8' },
    { bandwidth: 2000000, resolution: '1920x1080', url: 'b.m3u8' },
    { bandwidth: 1000000, resolution: '1280x720', url: 'c.m3u8' },
  ];

  it('picks the highest resolution variant when no quality is given', () => {
    expect(pickVariant(variants).url).toBe('b.m3u8');
  });

  it('picks the variant closest to the requested height', () => {
    expect(pickVariant(variants, '480').url).toBe('a.m3u8');
    expect(pickVariant(variants, '1080').url).toBe('b.m3u8');
  });

  it('ranks by bandwidth when resolution is missing', () => {
    const noRes = [
      { bandwidth: 500000, url: 'a.m3u8' },
      { bandwidth: 2000000, url: 'b.m3u8' },
    ];
    expect(pickVariant(noRes).url).toBe('b.m3u8');
  });
});

describe('parseMediaPlaylist', () => {
  it('parses segments with durations', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-TARGETDURATION:10',
      '#EXTINF:9.5,',
      'seg0.ts',
      '#EXTINF:10.0,',
      'seg1.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');

    const parsed = parseMediaPlaylist(playlist, 'https://cdn.example/a/main.m3u8');
    expect(parsed.encrypted).toBe(false);
    expect(parsed.targetDuration).toBe(10);
    expect(parsed.segments).toEqual([
      { url: 'https://cdn.example/a/seg0.ts', duration: 9.5 },
      { url: 'https://cdn.example/a/seg1.ts', duration: 10 },
    ]);
  });

  it('flags playlists with EXT-X-KEY as encrypted (DRM)', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-KEY:METHOD=AES-128,URI="https://k.example/key"',
      '#EXTINF:10.0,',
      'seg0.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');

    const parsed = parseMediaPlaylist(playlist, 'https://cdn.example/a/main.m3u8');
    expect(parsed.encrypted).toBe(true);
  });
});

describe('buildLocalPlaylist', () => {
  it('writes a VOD playlist referencing downloaded segment files', () => {
    const playlist = {
      targetDuration: 10,
      segments: [
        { url: 'ignored.ts', duration: 9.5 },
        { url: 'ignored.ts', duration: 10 },
      ],
      encrypted: false,
    };

    const local = buildLocalPlaylist(playlist);
    expect(local).toContain('#EXT-X-PLAYLIST-TYPE:VOD');
    expect(local).toContain('segments/seg_0000.ts');
    expect(local).toContain('segments/seg_0001.ts');
    expect(local).toContain('#EXTINF:9.500,');
    expect(local.endsWith('#EXT-X-ENDLIST\n')).toBe(true);
  });
});