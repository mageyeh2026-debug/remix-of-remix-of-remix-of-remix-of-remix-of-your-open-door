import kimoteImage from "@/assets/kimote.jpg";
import galzAboutImage from "@/assets/galz-about.jpg";
import kingsVirginImage from "@/assets/kings-virgin.jpg";
import bedroomChainImage from "@/assets/bedroom-chain.jpg";
import devilsChestImage from "@/assets/devils-chest-poster.jpg";
import tinkasStoryImage from "@/assets/tinkas-story.jpg";
import upcomingSilence from "@/assets/silence-we-flee.avif";
import upcomingBullock from "@/assets/john-bullock.avif";
import upcomingModernRoad from "@/assets/modern-road.avif";

export type Film = {
  slug: string;
  name: string;
  year: string;
  runtime: string;
  genre: string;
  image: string;
  logline: string;
  synopsis: string;
  cast: string[];
  status?: string;
};

export const films: Film[] = [
  {
    slug: "kimote",
    name: "Kimote",
    year: "",
    runtime: "Film",
    genre: "Drama",
    image: kimoteImage,
    logline: "A cloth that tells our tale.",
    synopsis: "Kimote, written by Can Themba and directed by Darrell J. Roodt.",
    cast: ["Sbu Nkosi", "Kenneth Nkosi"],
  },
  {
    slug: "galz-about",
    name: "Galz About",
    year: "",
    runtime: "Film",
    genre: "Drama",
    image: galzAboutImage,
    logline: "A New Cinema Production film.",
    synopsis: "Galz About, presented by New Cinema Production.",
    cast: ["Bonzila", "Gaetsewe Kama", "Luthuli Faraga", "Denti"],
  },
  {
    slug: "kings-virgin",
    name: "King's Virgin",
    year: "",
    runtime: "Film",
    genre: "Drama",
    image: kingsVirginImage,
    logline: "A Mageye Hassan film.",
    synopsis: "King's Virgin, written and directed by Mageye Hassan.",
    cast: ["Namikaga Pedro", "Prince Joe Nakibeni", "Nakanyike Joan", "Namwinge Sophian"],
  },
  {
    slug: "bedroom-chain",
    name: "Bedroom Chain",
    year: "",
    runtime: "Film",
    genre: "Drama",
    image: bedroomChainImage,
    logline: "Written and directed by Alan Uwadzi.",
    synopsis: "Bedroom Chain, a Kalmay production.",
    cast: ["Mima Kalmma", "Makenya Joanna Jozo", "Lewis Lukhon", "Jerry Roberts", "Sarah Isaac"],
  },
  {
    slug: "devils-chest",
    name: "Devil's Chest",
    year: "",
    runtime: "Film",
    genre: "Historical drama",
    image: devilsChestImage,
    logline: "The story of the Women's Army in the freedom struggle.",
    synopsis: "A Mageye Hassan film inspired by the true story of Joseph Kony (LRA) and the affliction of women.",
    cast: ["Musaba Samuel", "Nande Nakitende"],
  },
  {
    slug: "tinkas-story",
    name: "Tinka's Story",
    year: "2022",
    runtime: "Film",
    genre: "Drama",
    image: tinkasStoryImage,
    logline: "Tinka the dead summoner.",
    synopsis: "Written and directed by Mageye Hassan. Official selection at The African Film Festival 2022.",
    cast: ["Kebirungi Agnes Knight", "Jeffroberts Walusimbi", "Tania S. Kankindi", "Jayant Maru", "Nakitende Hasifah"],
  },
];

export const upcomingFilms: Film[] = [
  {
    slug: "the-silence-we-flee",
    name: "The Silence We Flee",
    year: "",
    runtime: "Coming soon",
    genre: "Drama",
    image: upcomingSilence,
    status: "Coming soon",
    logline: "A woman on the run. A truth they will kill to bury.",
    synopsis: "An upcoming film by Hassan Mageye.",
    cast: ["Casting in progress"],
  },
  {
    slug: "modern-road",
    name: "Modern Road",
    year: "",
    runtime: "Coming soon",
    genre: "Drama",
    image: upcomingModernRoad,
    status: "Coming soon",
    logline: "Some journeys change a nation.",
    synopsis: "An upcoming film written and directed by Hassan Mageye.",
    cast: ["Casting in progress"],
  },
  {
    slug: "john-bullock",
    name: "John Bullock",
    year: "",
    runtime: "Coming soon",
    genre: "Drama",
    image: upcomingBullock,
    status: "Coming soon",
    logline: "An upcoming Mageye Global Works film.",
    synopsis: "An upcoming film written and directed by Hassan Mageye.",
    cast: ["Artists to be announced"],
  },
];

export const allFilms = [...films, ...upcomingFilms];

export function getFilm(slug: string) {
  return allFilms.find((film) => film.slug === slug);
}
