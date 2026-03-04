import { useState } from "react";
import LoadingScreen from "./LoadingScreen";
import HeroSection from "./HeroSection";
import SelectedWorks from "./SelectedWorks";
import Journal from "./Journal";
import Explorations from "./Explorations";
import Stats from "./Stats";
import ContactFooter from "./ContactFooter";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className="landing-page"
      style={{
        fontFamily: "var(--font-body)",
        background: "hsl(0 0% 4%)",
        color: "hsl(0 0% 96%)",
      }}
    >
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      {!isLoading && (
        <>
          <HeroSection />
          <SelectedWorks />
          <Journal />
          <Explorations />
          <Stats />
          <ContactFooter />
        </>
      )}
    </div>
  );
}
