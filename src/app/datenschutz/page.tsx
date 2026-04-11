export default function Datenschutz() {
  return (
    <div className="container mx-auto p-6 min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Datenschutzerklärung</h1>

      <div className="space-y-6">
        {/* Verantwortlicher */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">1. Verantwortlicher</h2>
          <p>Agroforst Frank Fege</p>
          <p>Musterstraße 1</p>
          <p>12345 Brandenburg, Deutschland</p>
          <p>Telefon: +49 (0) 123 456 789</p>
          <p>E-Mail: info@permdal.de</p>
        </section>

        {/* Datenverarbeitung */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">2. Datenverarbeitung</h2>
          <p>
            Wir verarbeiten personenbezogene Daten nur, soweit dies für den Betrieb der Website, für Anmeldungen, für Bestellungen und für die von uns angebotenen Leistungen erforderlich ist. Wenn für einzelne Funktionen eine Einwilligung nötig ist, holen wir sie gesondert ein.
          </p>
        </section>

        {/* Appwrite Auth */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">3. Nutzung von Appwrite für Login</h2>
          <p>
            Wir nutzen Appwrite als Backend für Anmeldung und Sitzungsverwaltung. Dafür werden nur technisch nötige Session-Daten verarbeitet, damit eingeloggte Nutzer erkannt und angemeldet bleiben können.
          </p>
          <p className="mt-2">
            Die Website ist grundsätzlich auch ohne Cookies nutzbar; für Login-Funktionen werden technisch nötige Session-Daten verwendet.
          </p>
          <p className="mt-2">
            Appwrite kann dafür Session-Metadaten wie IP-Adresse, Client und Standortinformationen speichern. Diese Daten dienen der Verwaltung der Anmeldung und nicht dem Tracking oder Marketing. Weitere Informationen finden Sie in der <a href="https://appwrite.io/docs/references/cloud/models/session" className="text-blue-500 hover:underline">Appwrite Session-Dokumentation</a>.
          </p>
        </section>

        {/* Registrierung */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">4. Registrierung</h2>
          <p>
            Nutzer können sich auf unserer Website registrieren. Die dafür eingegebenen Daten werden an unser Backend übermittelt und dort gespeichert. Folgende Daten werden im Rahmen des Registrierungsprozesses erhoben:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Passwort</li>
          </ul>
          <p className="mt-2">
            Die Registrierung ist für die Nutzung von Login- und Kontofunktionen erforderlich. Soweit einzelne Schritte eine Einwilligung erfordern, wird diese vorab eingeholt und kann jederzeit widerrufen werden.
          </p>
        </section>

        {/* Rechte der Nutzer */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">6. Rechte der Nutzer</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Einschränkung der Verarbeitung und Löschung Ihrer personenbezogenen Daten, soweit dem keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Bitte wenden Sie sich dazu an die im Impressum genannten Kontaktdaten.
          </p>
        </section>

        {/* Änderungen */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">7. Änderungen der Datenschutzerklärung</h2>
          <p>
            Wir passen diese Datenschutzerklärung an, wenn sich unsere Leistungen, die eingesetzten Dienste oder die rechtlichen Anforderungen ändern. Für Ihren erneuten Besuch gilt die jeweils aktuelle Fassung.
          </p>
        </section>
      </div>

      {/* Letzte Aktualisierung */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
        Letzte Aktualisierung: März 2025
      </p>
    </div>
  );
}
