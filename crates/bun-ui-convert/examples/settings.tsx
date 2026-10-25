// Settings page: top app bar, tabs, lists with switches, a slider and radio choices.
import { Button, IconButton, List, ListItem, Radio, Slider, Switch, Tab, Tabs, TopAppBar } from "@aphrody/m3-baseui";
import "./settings.css";

export default function SettingsPage({ onBack, onSave, onReset, onOpenAbout }: SettingsProps) {
  return (
    <div className="page">
      <TopAppBar title="Settings">
        <IconButton slot="navigation" icon="go-previous-symbolic" aria-label="Back" onClick={onBack} />
        <IconButton icon="help-about-symbolic" aria-label="About" onClick={onOpenAbout} />
      </TopAppBar>
      <Tabs>
        <Tab label="General" icon="preferences-system-symbolic">
          <h2 className="section-title">Connectivity</h2>
          <List>
            <ListItem headline="Wi-Fi" supportingText="Connect to nearby networks">
              <Switch id="wifi" checked />
            </ListItem>
            <ListItem headline="Bluetooth" supportingText="Visible as Bun OS">
              <Switch id="bluetooth" />
            </ListItem>
            <ListItem headline="About this device" icon="computer-symbolic" onClick={onOpenAbout} />
          </List>
          <h2 className="section-title">Sound</h2>
          <Slider id="volume" label="Volume" min={0} max={100} value={65} />
        </Tab>
        <Tab label="Appearance" icon="applications-graphics-symbolic">
          <p className="hint">Choose how Bun OS looks.</p>
          <Radio name="theme" value="system" label="Follow system" checked />
          <Radio name="theme" value="light" label="Light" />
          <Radio name="theme" value="dark" label="Dark" />
        </Tab>
      </Tabs>
      <div className="actions">
        <Button variant="text" onClick={onReset}>Reset</Button>
        <Button variant="filled" onClick={() => onSave()}>Save</Button>
      </div>
    </div>
  );
}
