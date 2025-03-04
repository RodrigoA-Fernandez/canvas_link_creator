import { App, ItemView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CanvasState } from 'src/utils/canvas_utils';
import { Node, TextNode } from 'src/@types/Node'
import { Edge } from 'src/@types/Edge';


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
      id: 'create-link-edges',
      name: 'Create edges on canvas based on links between nodes',
      checkCallback: (check: boolean) => {
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView === null) {
          return false;
        }

        let canvasState: CanvasState = new CanvasState(this.app, canvasView);
        //@ts-ignore
        const canvas = canvasView.canvas;
        const currentData = canvas.getData();

        if (!check) {
          // console.log(canvasState.edgesFromMissingLinks());

          let [newEdges, newNodes]: [Edge[], TextNode[]] = canvasState.edgesFromMissingLinks();
          currentData.edges = [
            ...currentData.edges,
            ...newEdges
          ];
          currentData.nodes = [
            ...currentData.nodes,
            ...(newNodes.map((e) => {
              let node = {
                id: e.id,
                x: e.position[0],
                y: e.position[1],
                width: 250,
                height: 60,
                type: "text",
                text: e.text
              };
              return node;
            }))
          ]

          canvas.setData(currentData);
          canvas.requestSave();
        }

        // console.log(currentData);
        return true;
      }
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
