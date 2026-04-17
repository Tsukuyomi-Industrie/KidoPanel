/**
 * Configuration de création de conteneur persistée côté navigateur (laboratoire).
 * Le champ `corps` reprend la forme du corps `POST /containers` attendue par la passerelle.
 */
export type ConfigurationCreationConteneurSauvegardee = {
  id: string;
  nom: string;
  corps: Record<string, unknown>;
};
