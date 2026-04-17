type PropsEnteteSessionKidoPanel = {
  emailUtilisateur: string;
};

/**
 * Bandeau au-dessus du contenu : rappel discret du compte actif sans dupliquer les liens déjà présents sur le rail.
 */
export function EnteteSessionKidoPanel({ emailUtilisateur }: PropsEnteteSessionKidoPanel) {
  return (
    <header className="kidopanel-entete-session">
      <div className="kidopanel-entete-session__spacer" aria-hidden="true" />
      <p className="kidopanel-entete-session__compte" title={emailUtilisateur}>
        <span className="kidopanel-entete-session__etiquette">Session</span>
        <span className="kidopanel-entete-session__email">{emailUtilisateur}</span>
      </p>
    </header>
  );
}
