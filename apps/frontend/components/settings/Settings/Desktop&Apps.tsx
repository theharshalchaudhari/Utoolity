
import DesktopIcons from "./Desktop&Apps/DesktopIcons";
import IconSize from "./Desktop&Apps/IconSize";
import StatusWidget from "./Desktop&Apps/StatusWidget";

export default function DesktopApps() {
  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold tracking-tight">
        Desktop & apps
      </h2>
      <DesktopIcons />
      <IconSize />
      <StatusWidget />
    </div>
  );
}
