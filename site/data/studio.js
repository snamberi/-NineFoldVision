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
  // The Watch page. It shows this TikTok account's latest videos automatically; add full video links to
  // `pinned` (e.g. 'https://www.tiktok.com/@ninefoldvision/video/7412345678901234567') to feature them above.
  tiktok: { username: 'ninefoldvision', pinned: [] },
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
