import Hero from "@/components/home/Hero";
import StarweaveRoom from "@/components/starweave/StarweaveRoom";
import Nightfall from "@/components/starweave/Nightfall";
import LightsDown from "@/components/arthouse/LightsDown";
import ArthouseRoom from "@/components/arthouse/ArthouseRoom";
import LightsUp from "@/components/arthouse/LightsUp";
import About from "@/components/home/About";
import Contact from "@/components/home/Contact";
import SiteNav from "@/components/nav/SiteNav";
import XRay from "@/components/xray/XRay";
import HostLayer from "@/components/host/HostLayer";
import Ground from "@/components/ground/Ground";
import "@/components/home/home.css";
import "@/components/host/host.css";

export default function Home() {
  return (
    <>
      <Ground />
      <SiteNav />
      <Hero />
      <main>
        <Nightfall />
        <div id="work">
          <StarweaveRoom n={1} />
          <LightsDown />
          <ArthouseRoom n={2} />
          <LightsUp />
        </div>
        <About />
      </main>
      <Contact />
      <HostLayer />
      <XRay />
    </>
  );
}
