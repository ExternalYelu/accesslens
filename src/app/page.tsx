import { Workspace } from "@/components/workspace";

export default function Home() {
  return <Workspace liveEnabled={process.env.NODE_ENV === "development"} />;
}
