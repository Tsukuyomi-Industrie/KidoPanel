import { LISTE_GABARITS_JEU_INSTANCE } from "@kidopanel/container-catalog";
import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { creerInstanceServeurJeuxPasserelle } from "../passerelle/serviceServeursJeuxPasserelle.js";
import { EtapeConfigurationCreationServeur, construireValeursInitialesDepuisChamps } from "./EtapeConfigurationCreationServeur.js";
import { EtapeConfirmationCreationServeur } from "./EtapeConfirmationCreationServeur.js";
import { EtapeListeJeuxCreationServeur } from "./EtapeListeJeuxCreationServeur.js";
import {
  type OptionsReseauCreationInstanceJeux,
  traduireServeurPersonnaliseVersCorpsApi,
  traduireValeursFormulaireVersCorpsApi,
  type StrategieReseauCreationInstanceJeux,
} from "./traducteur-formulaire-vers-api.js";

function construireOptsReseauPourCreationInstanceJeux(params: {
  strategieReseau: StrategieReseauCreationInstanceJeux;
  idReseauInterneSelectionne: string;
  primaireKidopanel: boolean;
}): OptionsReseauCreationInstanceJeux | undefined {
  if (params.strategieReseau === "kidopanel_seul") {
    return undefined;
  }
  const base: OptionsReseauCreationInstanceJeux = {
    strategie: params.strategieReseau,
    idReseauInterneUtilisateurSelectionne: params.idReseauInterneSelectionne.trim(),
  };
  if (
    params.strategieReseau === "kidopanel_et_pont_utilisateur" &&
    params.primaireKidopanel === false
  ) {
    return { ...base, primaireKidopanel: false };
  }
  return base;
}

/**
 * Assistant en trois étapes : choix du jeu, paramètres métiers et confirmation sans JSON ni variables Docker brutes.
 */
export function PageCreationServeur() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [modePersonnalise, setModePersonnalise] = useState(false);
  const [gabaritChoisi, setGabaritChoisi] = useState<GabaritJeuCatalogueInstance | null>(
    null,
  );

  const [nomAffiche, setNomAffiche] = useState("");
  const [memoireMb, setMemoireMb] = useState(3072);
  const [cpuCores, setCpuCores] = useState(2);
  const [diskGb, setDiskGb] = useState(20);
  const [valeursFormulaireMétier, setValeursFormulaireMétier] = useState<
    Record<string, string>
  >({});

  const [strategieReseau, setStrategieReseau] =
    useState<StrategieReseauCreationInstanceJeux>("kidopanel_seul");
  const [idReseauInterneSelectionne, setIdReseauInterneSelectionne] = useState("");
  const [primaireKidopanel, setPrimaireKidopanel] = useState(true);

  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [secondesInstallationAffichees, setSecondesInstallationAffichees] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (secondesInstallationAffichees === null || secondesInstallationAffichees <= 0) {
      return;
    }
    const id = globalThis.setInterval(() => {
      setSecondesInstallationAffichees((s) =>
        s !== null && s > 0 ? s - 1 : 0,
      );
    }, 1000);
    return () => globalThis.clearInterval(id);
  }, [secondesInstallationAffichees]);

  const gabarits = useMemo(
    () =>
      LISTE_GABARITS_JEU_INSTANCE.filter((g) => g.id !== "tmpl-jeu-personnalise"),
    [],
  );

  const valeursInitialesFormulaire = useMemo(() => {
    if (gabaritChoisi === null || modePersonnalise) {
      return {};
    }
    return construireValeursInitialesDepuisChamps(gabaritChoisi.champsFormulaire);
  }, [gabaritChoisi, modePersonnalise]);

  const choisirJeu = useCallback((g: GabaritJeuCatalogueInstance) => {
    setModePersonnalise(false);
    setGabaritChoisi(g);
    setNomAffiche(`Serveur ${g.name}`);
    setMemoireMb(g.defaultMemoryMb);
    setCpuCores(g.defaultCpuCores);
    setDiskGb(g.disqueParDefautGb);
    setStrategieReseau("kidopanel_seul");
    setIdReseauInterneSelectionne("");
    setPrimaireKidopanel(true);
    setEtape(2);
    setErreur(null);
  }, []);

  const choisirPersonnalise = useCallback(() => {
    setModePersonnalise(true);
    setGabaritChoisi(null);
    setNomAffiche("Mon serveur");
    setMemoireMb(2048);
    setCpuCores(1);
    setDiskGb(10);
    setStrategieReseau("kidopanel_seul");
    setIdReseauInterneSelectionne("");
    setPrimaireKidopanel(true);
    setEtape(2);
    setErreur(null);
  }, []);

  const retourEtape1 = useCallback(() => {
    setEtape(1);
    setErreur(null);
  }, []);

  const retourEtapeConfiguration = useCallback(() => {
    setEtape(2);
    setErreur(null);
  }, []);

  const allerConfirmation = useCallback(() => {
    setErreur(null);
    if (nomAffiche.trim().length === 0) {
      setErreur("Indiquez un nom de serveur.");
      return;
    }
    if (
      strategieReseau !== "kidopanel_seul" &&
      idReseauInterneSelectionne.trim().length === 0
    ) {
      setErreur(
        "Choisissez un pont créé dans le panel ou repassez sur « Réseau KidoPanel uniquement ».",
      );
      return;
    }
    setEtape(3);
  }, [idReseauInterneSelectionne, nomAffiche, strategieReseau]);

  const allerConfirmationDepuisFormulaire = useCallback(
    (vals: Record<string, string>) => {
      setValeursFormulaireMétier(vals);
      setErreur(null);
      if (nomAffiche.trim().length === 0) {
        setErreur("Indiquez un nom de serveur.");
        return;
      }
      if (
        strategieReseau !== "kidopanel_seul" &&
        idReseauInterneSelectionne.trim().length === 0
      ) {
        setErreur(
          "Choisissez un pont créé dans le panel ou repassez sur « Réseau KidoPanel uniquement ».",
        );
        return;
      }
      setEtape(3);
    },
    [idReseauInterneSelectionne, nomAffiche, strategieReseau],
  );

  const lancerInstallation = useCallback(() => {
    if (modePersonnalise) {
      (async () => {
        const estime = 120;
        setSecondesInstallationAffichees(estime);
        setEnCours(true);
        setErreur(null);
        try {
          const optsReseau = construireOptsReseauPourCreationInstanceJeux({
            strategieReseau,
            idReseauInterneSelectionne,
            primaireKidopanel,
          });
          const corps = traduireServeurPersonnaliseVersCorpsApi(
            {
              nomServeur: nomAffiche,
              memoryMb: memoireMb,
              cpuCores,
              diskGb,
            },
            optsReseau,
          );
          const cree = await creerInstanceServeurJeuxPasserelle(corps);
          navigate(`/serveurs/${encodeURIComponent(cree.id)}`, { replace: true });
        } catch (error_) {
          setErreur(error_ instanceof Error ? error_.message : "Création refusée.");
        } finally {
          setEnCours(false);
          setSecondesInstallationAffichees(null);
        }
      })().catch(() => {});
      return;
    }
    if (gabaritChoisi === null) {
      return;
    }
    (async () => {
      const estime = gabaritChoisi.installTimeEstimateSeconds;
      setSecondesInstallationAffichees(estime);
      setEnCours(true);
      setErreur(null);
      try {
        const optsReseau = construireOptsReseauPourCreationInstanceJeux({
          strategieReseau,
          idReseauInterneSelectionne,
          primaireKidopanel,
        });
        const corps = traduireValeursFormulaireVersCorpsApi(
          {
            gabarit: gabaritChoisi,
            nomServeur: nomAffiche,
            memoryMb: memoireMb,
            cpuCores,
            diskGb,
            valeursChamps: valeursFormulaireMétier,
          },
          optsReseau,
        );
        const cree = await creerInstanceServeurJeuxPasserelle(corps);
        navigate(`/serveurs/${encodeURIComponent(cree.id)}`, { replace: true });
      } catch (error_) {
        setErreur(error_ instanceof Error ? error_.message : "Création refusée.");
      } finally {
        setEnCours(false);
        setSecondesInstallationAffichees(null);
      }
    })().catch(() => {});
  }, [
    cpuCores,
    diskGb,
    gabaritChoisi,
    idReseauInterneSelectionne,
    memoireMb,
    modePersonnalise,
    navigate,
    nomAffiche,
    primaireKidopanel,
    strategieReseau,
    valeursFormulaireMétier,
  ]);

  return (
    <div className="kidopanel-page-centree">
      <p className="kidopanel-texte-muted">
        <Link to="/serveurs" className="kidopanel-lien-bouton-secondaire">
          Retour à la liste
        </Link>
      </p>

      {etape === 1 ? (
        <EtapeListeJeuxCreationServeur
          gabarits={gabarits}
          surChoisirJeu={choisirJeu}
          surChoisirPersonnalise={choisirPersonnalise}
        />
      ) : null}

      {etape === 2 ? (
        <>
          <button type="button" className="bouton-secondaire-kido" onClick={retourEtape1}>
            Retour au choix du jeu
          </button>
          <EtapeConfigurationCreationServeur
            messageErreur={erreur}
            modePersonnalise={modePersonnalise}
            gabaritChoisi={gabaritChoisi}
            nomAffiche={nomAffiche}
            surNomAffiche={setNomAffiche}
            memoireMb={memoireMb}
            surMemoireMb={setMemoireMb}
            cpuCores={cpuCores}
            surCpuCores={setCpuCores}
            diskGb={diskGb}
            surDiskGb={setDiskGb}
            valeursInitialesFormulaire={valeursInitialesFormulaire}
            surContinuerAvecFormulaire={allerConfirmationDepuisFormulaire}
            surContinuerPersonnalise={allerConfirmation}
            strategieReseau={strategieReseau}
            surStrategieReseau={setStrategieReseau}
            idReseauInterneSelectionne={idReseauInterneSelectionne}
            surIdReseauInterneSelectionne={setIdReseauInterneSelectionne}
            primaireReseauKidopanel={primaireKidopanel}
            surPrimaireReseauKidopanel={setPrimaireKidopanel}
          />
        </>
      ) : null}

      {etape === 3 ? (
        <>
          <button type="button" className="bouton-secondaire-kido" onClick={retourEtapeConfiguration}>
            Modifier la configuration
          </button>
          <EtapeConfirmationCreationServeur
            modePersonnalise={modePersonnalise}
            gabaritChoisi={gabaritChoisi}
            nomAffiche={nomAffiche}
            memoireMb={memoireMb}
            cpuCores={cpuCores}
            diskGb={diskGb}
            erreur={erreur}
            enCours={enCours}
            secondesInstallationAffichees={secondesInstallationAffichees}
            surLancer={lancerInstallation}
          />
        </>
      ) : null}
    </div>
  );
}
