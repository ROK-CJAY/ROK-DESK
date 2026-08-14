import { emptyTeam, type TeamMon } from "@/lib/pokemon-vgc";

export type SignupDraft = {
  name: string;
  tag: string;
  pronouns: string;
  country: string;
  deck: string;
  playerId: string;
  trainerName: string;
  switchProfile: string;
  ageDivision: "" | "juniors" | "seniors" | "masters";
  birthDate: string;
  team: TeamMon[];
};

export const emptySignupDraft = (): SignupDraft => ({
  name: "",
  tag: "",
  pronouns: "",
  country: "US",
  deck: "",
  playerId: "",
  trainerName: "",
  switchProfile: "",
  ageDivision: "",
  birthDate: "",
  team: emptyTeam(),
});
