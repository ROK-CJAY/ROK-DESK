import { emptyTeam, type TeamMon } from "@/lib/pokemon-vgc";
import { emptyDecklist, type DeckCard } from "@/lib/decklist";

export type SignupDraft = {
  name: string;
  tag: string;
  pronouns: string;
  country: string;
  deck: string;
  partner: string;
  playerId: string;
  trainerName: string;
  switchProfile: string;
  ageDivision: "" | "juniors" | "seniors" | "masters";
  birthDate: string;
  team: TeamMon[];
  idPrivacy: boolean;
  ink1: string;
  ink2: string;
  note: string;
  photoUrl: string;
  decklist: DeckCard[];
};

export const emptySignupDraft = (): SignupDraft => ({
  name: "",
  tag: "",
  pronouns: "",
  country: "US",
  deck: "",
  partner: "",
  playerId: "",
  trainerName: "",
  switchProfile: "",
  ageDivision: "",
  birthDate: "",
  team: emptyTeam(),
  idPrivacy: false,
  ink1: "",
  ink2: "",
  note: "",
  photoUrl: "",
  decklist: emptyDecklist(),
});
