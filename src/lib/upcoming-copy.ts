/** Editorial copy for upcoming projects, shared by the home rail and detail pages. */
export type UpcomingCopy = { genre: string; synopsis: string; support: string };

const modernRoadCopy: UpcomingCopy = {
  genre: "Drama | Human Story | Contemporary",
  synopsis:
    "The Modern Road explores the lives, choices, and struggles of people navigating a rapidly changing world, where ambition, relationships, and survival collide. It is a human story about the roads we choose, the people we meet along the way, and the consequences that follow us.",
  support:
    "Help us bring The Modern Road to life. Your support helps move this story from vision to screen.",
};

export const upcomingDetails: Record<string, UpcomingCopy> = {
  "the-silence-we-flee": {
    genre: "Drama | Thriller | International",
    synopsis:
      "After fleeing her homeland with evidence connected to her father’s murder, a young woman seeks safety in America—only to discover that distance cannot silence the forces hunting her. The Silence We Flee is a tense drama about survival, displacement, truth, and the price of carrying a secret across borders.",
    support:
      "Help us complete the film and bring it to audiences worldwide. Your support helps us take this story from production to the screen.",
  },
  // "mordern-road" is the slug saved in the dashboard for Modern Road.
  "modern-road": modernRoadCopy,
  "mordern-road": modernRoadCopy,
  "john-bullock": {
    genre: "Psychological Thriller | Drama",
    synopsis:
      "A young African student takes a caregiving job inside a quiet family home, where locked doors, strange routines, and a mother’s obsessive control begin to reveal something deeply unsettling. John Bullock is a psychological thriller about family, control, memory, and the terrifying things people can justify in the name of love.",
    support:
      "Become part of our next production. Your support helps us move John Bullock from script to screen.",
  },
};

export const supportLevels = [
  { amount: "$25", amountUsd: 25, label: "Supporter", className: "support-tier-base" },
  { amount: "$50", amountUsd: 50, label: "Film Friend", className: "support-tier-friend" },
  { amount: "$100", amountUsd: 100, label: "Production Supporter", className: "support-tier-production" },
] as const;
