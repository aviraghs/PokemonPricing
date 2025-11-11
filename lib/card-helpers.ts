// Helper functions for card operations

export function extractCardName(title: string): string {
  let name = title;
  name = name.replace(/\s*#?\d+\/\d+/g, '');
  name = name.replace(/\s*#\d+/g, '');
  name = name.replace(/\s+\d+$/, '');
  name = name.replace(
    /\s*-\s*(Holo|Reverse Holo|Non-Holo|Rare|Ultra Rare|Secret Rare|Promo|Foil|VMAX|VSTAR|GX|Break|Tag Team|Full Art|Alternate Art|Secret Rare|Hyper Rare|Rainbow Rare|Gold Rare|Shiny|Cosmo Holo|Prism Star|Radiant|Amazing Rare|Trainer|Energy)\b/gi,
    ''
  );
  name = name.replace(
    /\s*\b(Pokemon|Card|TCG|Sealed|Lot|Bundle|Collection|Booster|Pack|Box|Case|Complete Set)\b/gi,
    ''
  );
  name = name.trim().replace(/\s+/g, ' ');
  return name;
}

export function extractSetFromTitle(title: string): string {
  const patterns = [
    /Crown Zenith/i,
    /Scarlet.*Violet/i,
    /Sword.*Shield/i,
    /Sun.*Moon/i,
    /XY/i,
    /Black.*White/i,
    /Jungle/i,
    /Base Set/i,
    /Fossil/i,
    /Team Rocket/i,
    /Furious Fists/i,
    /Evolutions/i,
    /Team Up/i,
    /Unified Minds/i,
    /Cosmic Eclipse/i,
    /Rebel Clash/i,
    /Darkness Ablaze/i,
    /Vivid Voltage/i,
    /Battle Styles/i,
    /Chilling Reign/i,
    /Evolving Skies/i,
    /Fusion Strike/i,
    /Brilliant Stars/i,
    /Astral Radiance/i,
    /Lost Origin/i,
    /Silver Tempest/i,
    /Paldea Evolved/i,
    /Obsidian Flames/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[0];
  }
  return 'Unknown Set';
}

// Request queue to prevent rate limiting
export class RequestQueue {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private processing = false;
  private delayMs: number;

  constructor(delayMs: number = 100) {
    this.delayMs = delayMs;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }

      // Add delay between requests
      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.delayMs));
      }
    }

    this.processing = false;
  }
}
