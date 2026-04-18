-- Double attachement réseau (kidopanel-network + pont utilisateur) pour les instances jeu.

ALTER TABLE "GameServerInstance" ADD COLUMN "attacherReseauKidopanelComplement" BOOLEAN NOT NULL DEFAULT false;
