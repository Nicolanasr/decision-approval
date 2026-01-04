import LandingPage from "@/components/landing/LandingPage";
import Navbar from "@/components/landing/Navbar";

export default function HomePage() {
  return (
    <div className="bg-white text-slate-900">
      <Navbar />
      <LandingPage />
    </div>
  );
}
