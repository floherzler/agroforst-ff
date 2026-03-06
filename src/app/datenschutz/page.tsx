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
            Wir verarbeiten personenbezogene Daten unserer Nutzer nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung personenbezogener Daten unserer Nutzer erfolgt regelmäßig nur nach Einwilligung des Nutzers. Eine Ausnahme gilt in solchen Fällen, in denen eine vorherige Einholung einer Einwilligung aus tatsächlichen Gründen nicht möglich ist und die Verarbeitung der Daten durch gesetzliche Vorschriften gestattet ist.
          </p>
        </section>

        {/* Appwrite Cloud */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">3. Nutzung von Appwrite Cloud</h2>
          <p>
            Wir nutzen Appwrite Cloud als Backend-Service für unsere Anwendungen. Appwrite ist DSGVO-konform und stellt sicher, dass personenbezogene Daten unserer Nutzer sicher verarbeitet werden. Weitere Informationen finden Sie in der <a href="https://appwrite.io/docs/advanced/security" className="text-blue-500 hover:underline">Datenschutzerklärung von Appwrite</a>.
          </p>
        </section>

        {/* Registrierung */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">4. Registrierung</h2>
          <p>
            Nutzer haben die Möglichkeit, sich auf unserer Website unter Angabe von personenbezogenen Daten zu registrieren. Die Daten werden dabei in eine Eingabemaske eingegeben und an uns übermittelt und gespeichert. Eine Weitergabe der Daten an Dritte findet nicht statt. Folgende Daten werden im Rahmen des Registrierungsprozesses erhoben:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Passwort</li>
          </ul>
          <p className="mt-2">
            Die Verarbeitung der Daten erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können diese Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bereits erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
          </p>
        </section>

        {/* Rechte der Nutzer */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">6. Rechte der Nutzer</h2>
          <p>
            Sie haben das Recht, jederzeit Auskunft über die von uns über Sie gespeicherten personenbezogenen Daten zu erhalten. Ebenso haben Sie das Recht auf Berichtigung, Sperrung oder, abgesehen von der vorgeschriebenen Datenspeicherung zur Geschäftsabwicklung, Löschung Ihrer personenbezogenen Daten. Bitte wenden Sie sich dazu an unseren Datenschutzbeauftragten. Die Kontaktdaten finden Sie ganz unten.
          </p>
        </section>

        {/* Änderungen */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">7. Änderungen der Datenschutzerklärung</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung gelegentlich anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
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
