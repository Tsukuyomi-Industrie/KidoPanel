/**
 * Points d’entrée passerelle pour le journal JSON stdout partagé (`@kidopanel/database`).
 */

import {
  creerJournalJsonStdoutPourNomServiceInterne,
  type EntreeJournalJsonStdout,
} from "@kidopanel/database/journal-json-service-stdout";

export type NiveauJournal = EntreeJournalJsonStdout["niveau"];
export type EntreeJournalPasserelle = EntreeJournalJsonStdout;

const { journaliser, journaliserErreur } =
  creerJournalJsonStdoutPourNomServiceInterne({
    nomServiceInterne: "gateway",
  });

export const journaliserPasserelle = journaliser;
export const journaliserErreurPasserelle = journaliserErreur;
