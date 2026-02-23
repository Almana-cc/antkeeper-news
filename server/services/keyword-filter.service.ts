// Positive keywords - articles must contain at least one of these
const englishKeywords = ["ants", "myrmecology"];
const frenchKeywords = ["fourmis", "myrmécologie"];
const spanishKeywords = ["hormigas", "mirmecología"];
const germanKeywords = ["ameisen", "myrmekologie"];

// Negative keywords - articles containing these should be excluded
// (pest control, extermination, getting rid of ants, etc.)
const englishNegativeKeywords = [
  "get rid of",
  "how to kill",
  "ant killer",
  "pest control",
  "exterminate",
  "extermination",
  "eliminate ants",
  "remove ants",
  "ant poison",
  "ant bait",
  "ant trap",
  "insecticide",
  "pesticide",
  "ant infestation",
  "ant problem",
  "ant invasion",
  "destroy ant",
  "kill ants",
  "ant spray",
  "terminator",
  "raid ants",
  "ant repellent",
  "keep ants away",
  "prevent ants",
  "ant-free",
  "unwanted ants",
  "nuisance",
  "carpenter ant damage",
  "fire ant sting",
  "ant bite treatment",
];

const frenchNegativeKeywords = [
  "se débarrasser",
  "comment tuer",
  "tuer les fourmis",
  "anti-fourmis",
  "anti fourmis",
  "tue fourmis",
  "tue-fourmis",
  "éradication",
  "éradiquer",
  "exterminer",
  "extermination",
  "éliminer les fourmis",
  "poison fourmis",
  "piège à fourmis",
  "piège fourmis",
  "appât fourmis",
  "insecticide",
  "pesticide",
  "invasion de fourmis",
  "infestation",
  "problème de fourmis",
  "nuisible",
  "nuisibles",
  "détruire les fourmis",
  "détruire",
  "le détruire",
  "répulsif",
  "chasser les fourmis",
  "fourmis indésirables",
  "piqûre de fourmi",
  "morsure de fourmi",
  "dégâts fourmis",
  "envahir",
  "envahissantes",
];

const spanishNegativeKeywords = [
  "deshacerse",
  "eliminar hormigas",
  "matar hormigas",
  "cómo matar",
  "veneno para hormigas",
  "control de plagas",
  "plaga de hormigas",
  "exterminar",
  "exterminación",
  "erradicar",
  "erradicación",
  "insecticida",
  "pesticida",
  "trampa para hormigas",
  "cebo para hormigas",
  "invasión de hormigas",
  "infestación",
  "problema de hormigas",
  "repelente",
  "ahuyentar hormigas",
  "hormigas no deseadas",
  "picadura de hormiga",
  "daños por hormigas",
];

const germanNegativeKeywords = [
  "loswerden",
  "ameisen töten",
  "ameisen bekämpfen",
  "ameisenbekämpfung",
  "ameisengift",
  "schädlingsbekämpfung",
  "ameisenplage",
  "vernichten",
  "ausrotten",
  "insektizid",
  "pestizid",
  "ameisenfalle",
  "ameisenköder",
  "ameisenspray",
  "ameiseninvasion",
  "ameisenbefall",
  "ameisenproblem",
  "abwehrmittel",
  "ameisen vertreiben",
  "unerwünschte ameisen",
  "ameisenbiss",
  "ameisenstich",
  "schädling",
];

function getPositiveKeywords(language: string): string[] {
  switch (language) {
    case "fr":
      return frenchKeywords;
    case "es":
      return spanishKeywords;
    case "de":
      return germanKeywords;
    case "en":
    default:
      return englishKeywords;
  }
}

function getNegativeKeywords(language: string): string[] {
  switch (language) {
    case "fr":
      return frenchNegativeKeywords;
    case "es":
      return spanishNegativeKeywords;
    case "de":
      return germanNegativeKeywords;
    case "en":
    default:
      return englishNegativeKeywords;
  }
}

/**
 * Check if the article contains negative/pest-control related content
 */
export function containsNegativeContent(
  title: string,
  description: string,
  language: string,
): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const negativeKeywords = getNegativeKeywords(language);

  for (const keyword of negativeKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the article matches positive keywords (is about ants/myrmecology)
 */
export function matchesPositiveKeywords(
  title: string,
  description: string,
  language: string,
): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const keywords = getPositiveKeywords(language);

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Main filter: article must match positive keywords AND NOT contain negative content
 */
export function matchesKeywords(
  title: string,
  description: string,
  language: string,
): boolean {
  if (!matchesPositiveKeywords(title, description, language)) {
    return false;
  }
  if (containsNegativeContent(title, description, language)) {
    return false;
  }
  return true;
}
