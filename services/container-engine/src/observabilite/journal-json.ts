/**
 * Points d’entrée moteur pour le journal JSON stdout partagé (`@kidopanel/database`).
 */

import {
  creerJournalJsonStdoutPourNomServiceInterne,
  type EntreeJournalJsonStdout,
} from "@kidopanel/database/journal-json-service-stdout";

export type NiveauJournal = EntreeJournalJsonStdout["niveau"];
export type EntreeJournalMoteur = EntreeJournalJsonStdout;

const { journaliser, journaliserErreur } =
  creerJournalJsonStdoutPourNomServiceInterne({
    nomServiceInterne: "container-engine",
  });

export const journaliserMoteur = journaliser;
export const journaliserErreurMoteur = journaliserErreur;
