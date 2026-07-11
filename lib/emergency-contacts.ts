import type { Contact } from "./types";

// Static, zero-network emergency contacts. This is what makes "always
// available" literally true — no dependency on the LLM, weather API, or any
// external service that could be down when someone needs a number most.

export const NATIONAL_CONTACTS: Contact[] = [
  { label: "Police", number: "100" },
  { label: "Ambulance", number: "108" },
  { label: "Fire", number: "101" },
  { label: "NDMA / Disaster Helpline", number: "1078" },
  { label: "Women's Helpline", number: "1091" },
  { label: "Child Helpline", number: "1098" },
  { label: "Emergency (all-in-one)", number: "112" },
];

// Keyed by admin1 (state name as returned by Open-Meteo geocoding).
// Sparse by design — only numbers verified with reasonable confidence.
// Extend this table over time; never guess a digit.
const STATE_CONTROL_ROOMS: Record<string, Contact[]> = {
  Maharashtra: [{ label: "State Disaster Mgmt Control Room", number: "1077" }],
};

// Keyed by case-insensitive substring match against the resolved place name.
const CITY_CONTACTS: Record<string, Contact[]> = {
  Mumbai: [{ label: "BMC Disaster Control Room", number: "1916" }],
  Pune: [{ label: "PMC Disaster Control Room", number: "1077" }],
};

export function getContactsFor(
  place: string,
  state: string | null,
): { national: Contact[]; local: Contact[] } {
  const local: Contact[] = [];
  if (state && STATE_CONTROL_ROOMS[state]) local.push(...STATE_CONTROL_ROOMS[state]);
  for (const [city, contacts] of Object.entries(CITY_CONTACTS)) {
    if (place.toLowerCase().includes(city.toLowerCase())) local.push(...contacts);
  }

  const seen = new Set<string>();
  const dedup = local.filter((c) => {
    if (seen.has(c.number)) return false;
    seen.add(c.number);
    return true;
  });

  return { national: NATIONAL_CONTACTS, local: dedup };
}
