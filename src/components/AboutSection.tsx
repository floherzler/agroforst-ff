import { Link } from "@tanstack/react-router";

export default function AboutSection() {
  return (
    <div className="relative w-3/4 max-w-3xl p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 max-w-4xl mx-auto">
      <div className="w-full md:w-1/2">
        <img src="/img/kartoffel-hänger.jpeg" alt="Agroforst Frank Fege Landwirtschaft" className="rounded-lg" />
      </div>
      <div className="w-full md:w-1/2 text-center md:text-left">
        <h2 className="text-3xl font-bold text-gray-800">Agroforst Frank Fege</h2>
        <p className="text-lg text-gray-700">
          Wir bauen regionale Produkte an und zeigen, wie wir auf dem Hof arbeiten.
        </p>
        <p className="text-lg text-gray-700 mt-2">Mehr über Hof, Permdal und Team:</p>
        <div className="flex justify-center md:justify-start mt-4 space-x-4">
          <Link to="/ueber-aff"><button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold shadow-md border-2 border-brown-600 hover:bg-brown-400 transition-all">Über uns</button></Link>
          <Link to="/permdal"><button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold shadow-md border-2 border-brown-600 hover:bg-brown-400 transition-all">Permdal</button></Link>
        </div>
      </div>
    </div>
  );
}
