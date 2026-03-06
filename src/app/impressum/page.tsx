export default function Impressum() {
  return (
    <div className="container mx-auto p-6 min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Impressum</h1>

      <div className="space-y-6">
        {/* Betreiber */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Verantwortlicher Anbieter</h2>
          <p>Agroforst Frank Fege</p>
          <p>Musterstraße 1</p>
          <p>12345 Brandenburg, Deutschland</p>
        </div>

        {/* Kontakt */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Kontakt</h2>
          <p>Telefon: +49 (0) 123 456 789</p>
          <p>E-Mail: info@permdal.de</p>
        </div>

        {/* Vertretungsberechtigte */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Vertretungsberechtigter</h2>
          <p>Frank Fege</p>
        </div>

        {/* Registereintrag */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Handelsregister</h2>
          <p>Amtsgericht Musterstadt</p>
          <p>Registernummer: HRB 123456</p>
        </div>

        {/* Aufsichtsbehörde */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Aufsichtsbehörde</h2>
          <p>Landwirtschaftsaufsicht Brandenburg</p>
          <p>Behördenstraße 5, 10117 Berlin</p>
        </div>

        {/* Umsatzsteuer-ID */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Umsatzsteuer-Identifikationsnummer</h2>
          <p>DE123456789</p>
        </div>
      </div>

      {/* Letzte Aktualisierung */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
        Letzte Aktualisierung: März 2025
      </p>
    </div>
  );
}
