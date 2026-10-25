// File list: a navigation rail, a toolbar with filter chips and a list unrolled from a constant.
import { Chip, IconButton, LinearProgress, List, ListItem, NavigationRail, NavigationRailItem, TopAppBar } from "@aphrody/m3-baseui";
import "./files.css";

const FILES = [
  { name: "Documents", detail: "12 items", icon: "folder-documents-symbolic", size: "" },
  { name: "Pictures", detail: "248 items", icon: "folder-pictures-symbolic", size: "" },
  { name: "report-2026.pdf", detail: "Modified today", icon: "x-office-document-symbolic", size: "2.4 MB" },
  { name: "bun-os.iso", detail: "Modified yesterday", icon: "media-optical-symbolic", size: "1.9 GB" },
] as const;

export default function FileBrowser({ onHome, onRecent, onTrash, onOpen, onSearch, onFilter }: FileBrowserProps) {
  return (
    <div className="shell">
      <NavigationRail>
        <NavigationRailItem icon="user-home-symbolic" label="Home" selected onClick={onHome} />
        <NavigationRailItem icon="document-open-recent-symbolic" label="Recent" onClick={onRecent} />
        <NavigationRailItem icon="user-trash-symbolic" label="Trash" onClick={onTrash} />
      </NavigationRail>
      <div className="content">
        <TopAppBar title="Home" subtitle="4 items">
          <IconButton icon="system-search-symbolic" aria-label="Search" onClick={onSearch} />
        </TopAppBar>
        <div className="chips">
          <Chip variant="filter" label="Folders" selected onClick={onFilter} />
          <Chip variant="filter" label="Documents" onClick={onFilter} />
          <Chip variant="assist" icon="list-add-symbolic" label="New folder" />
        </div>
        <LinearProgress value={42} max={100} aria-label="Storage used" />
        <div className="scroller">
          <List>
            {FILES.map((file) => (
              <ListItem key={file.name} headline={file.name} supportingText={file.detail} icon={file.icon} trailingText={file.size} onClick={onOpen} />
            ))}
          </List>
        </div>
      </div>
    </div>
  );
}
