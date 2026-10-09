
import ThisSiteAsAnApp from "./ThisDevice/ThisSiteAsAnApp";

export default function ThisDevice() {
  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold tracking-tight">
        This device
      </h2>
      <ThisSiteAsAnApp />
    </div>
  );
}
