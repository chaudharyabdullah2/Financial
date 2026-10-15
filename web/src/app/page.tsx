import { Hero } from "@/components/landing/Hero";
import { Features, FinalCta, MetricsStrip, Pipeline } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <MetricsStrip />
      <Pipeline />
      <Features />
      <FinalCta />
    </>
  );
}
