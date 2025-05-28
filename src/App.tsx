import { useState } from "react";
import Bet from "./Bet";
import Navigation from "./components/Navigation";
import { AuthProvider } from "./context/AuthContext";

function App() {
  const [balance] = useState(1000);

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navigation balance={balance} />

        <main className="flex-1 p-8 flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1600px] w-full">
            <Bet headline="Will Professor Maple show up late tomorrow?" />
            <Bet headline="Beardall will be next professor to call out sick" />
            <Bet headline="Aaron Reed will be seen in the commons by Thursday" />
            <Bet headline="Fire alarm goes off by the end of next week" />
            <Bet headline="Weekly email is late" />
          </div>
        </main>

        <footer className="bg-[#333333] py-4 px-4 text-center text-sm text-white/70 border-t-2 border-[#f1c40f]">
          <p>
            © 2023 <span className="text-[#f1c40f]">NEUMONT POLYMARKET</span> -
            Trade on campus predictions
          </p>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
