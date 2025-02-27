import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { getEdges, getMissingLinks, getNodesInCanvas, isLink } from 'src/utils/canvas_utils';
import { Node } from 'src/@types/Node'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: 'crear-nodo',
      name: 'Crear nodo en Canvas',
      checkCallback: () => {
      }
    });
    this.registerDomEvent(document, 'click', (_: MouseEvent) => {
      const nodes: Array<Node> | null = getNodesInCanvas(this.app);
      const edges = getEdges(this.app);
      if (nodes === null || edges === null) {
        return;
      }
      // console.log(nodes);
      getMissingLinks(nodes, edges, this.app);
      // console.log(nodes);

    });

  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}



class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
