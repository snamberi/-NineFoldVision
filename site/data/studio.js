// Studio-wide settings. Empty fields are simply not shown on the site.
window.NFV_STUDIO = {
  name: 'NineFoldVision',
  tagline: 'One studio. Many worlds.',
  // Shown on the About page and in the footer when set, e.g. 'hello@yourdomain.com'.
  email: '',
  // The site's public address, used for share links.
  url: 'https://ninefoldvision.online',
  // Email sign-up ("Get new chapters and updates"). Make a free account at buttondown.com, then put your
  // Buttondown username here. The sign-up form stays hidden on every page until this is filled in.
  newsletter: { buttondown: '' },
  // The Watch page (YouTube).
  //   channelId: your channel ID (starts with UC; YouTube Studio → Settings → Channel → Advanced settings).
  //              When set, the page shows your latest uploads automatically.
  //   pinned:    video links to feature at the top, e.g. 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' or a Shorts link.
  // Videos load only after the visitor presses play (privacy-enhanced mode), so YouTube sets nothing before then.
  youtube: { url: 'https://www.youtube.com/@NineFoldVision', channelId: '', pinned: [] },
  // Legal pages (privacy.html, terms.html). `owner` is the person or company running the site; `country` sets
  // whose law applies to the terms. Contact uses `email` above, or the Discord server if that's empty.
  legal: { owner: 'NineFoldVision', country: '', updated: '2026-10-25' },
  // The community server every game links to.
  discord: 'https://discord.gg/5uGK5HDS8e',
  // Profiles shown in the footer, on Community and About. `id` picks the pixel icon; `blurb` is the Community card text.
  socials: [
    { id: 'discord', label: 'Discord', url: 'https://discord.gg/5uGK5HDS8e', blurb: 'Chat with players, share your runs, report bugs and hear about updates first.' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@NineFoldVision', blurb: 'Trailers, update walkthroughs and the story of every world.' },
    { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@ninefoldvision', blurb: 'Short clips, wild moments and behind-the-scenes from the studio.' },
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/ninefoldvision/', blurb: 'Pixel art, sneak peeks and release posters.' },
    { id: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/r/NineFoldVision/', blurb: 'Guides, theories about the Vision universe and long-form discussion.' },
  ],
};
