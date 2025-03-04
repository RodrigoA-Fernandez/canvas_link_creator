import { randomUUID } from "crypto";
import { ItemView, App, FrontMatterCache, FrontmatterLinkCache, TFile } from "obsidian";
import { Edge } from "src/@types/Edge";
import { isNamedLink, isNamedLinkTree, isNoteNode, isTextNode, isUnnamedLink, Link, NamedLink, NamedLinkTree, Node, NoteNode, TextNode, UnnamedLink } from "src/@types/Node";

export class CanvasState {
  app: App;
  canvasView: ItemView;
  nodes: Array<Node>;
  edges: Array<Edge>;

  constructor(app: App, canvasView: ItemView) {
    this.app = app;
    this.canvasView = canvasView;
    this.nodes = this.getNodesInCanvas();
    this.edges = this.getEdges();
  }

  /**
    @return {Array<Node>} Devuelve un Array con los nodos del Canvas o null en caso de no estar en un canvas al ejecutar la función.
   */
  getNodesInCanvas(): Array<Node> {
    //@ts-ignore
    const canvas = this.canvasView.canvas;
    const nodes: Map<String, any> = canvas.nodes;

    var nodeList: Array<Node> = new Array();
    for (let [k, v] of nodes) {
      switch (v.file) {
        //Entramos aquí si es un nodo de texto
        case undefined:
          nodeList.push(
            {
              id: k,
              position: [v.x, v.y],
              text: v.text
            }
          );
          break;

        //Entramos aquí si es un nodo con un archivo
        default:
          var links: Array<NamedLink | NamedLinkTree | UnnamedLink> = new Array();
          for (let link of this.parseFrontmatterLinks(v.file)) {
            links.push(link);
          };
          //Falta añadir los nodos que no están en el frontmatter y quitar los enlaces repetidos (salvo los que están en el frontmatter)
          //La función app.metadataCache.getFileCache(v.file)?.links; me da los enlaces, solo queda comrobar que ni hay ningún 
          var nonFmLinks: Array<Link> | undefined = this.app.metadataCache.getFileCache(v.file)?.links?.map((e) => {
            return this.linkFromText(e.original, v.file);
          });
          if (nonFmLinks !== undefined && nonFmLinks.length !== 0) {
            var possibleNonRepeatedLinks = [...new Set(nonFmLinks)];
            let linksLength: number = links.length;
            for (let i = 0; i < possibleNonRepeatedLinks.length; i++) {
              let isRepeated: boolean = false;
              for (let j = 0; j < linksLength; j++) {
                let l = links[j];
                if (isNamedLinkTree(l)) {
                  for (let entry of l.links) {
                    if (entry.fileName === possibleNonRepeatedLinks[i].fileName) {
                      isRepeated = true;
                      break;
                    }
                  }
                } else if (l.fileName === possibleNonRepeatedLinks[i].fileName) {
                  isRepeated = true;
                }
                if (isRepeated) {
                  break;
                }
              }
              if (!isRepeated) {
                links.push(possibleNonRepeatedLinks[i]);
              }
            }
          }


          nodeList.push({
            id: k,
            position: [v.x, v.y],
            filePath: v.filePath,
            displayName: v.file.basename,
            links: links,
          });
          break;
      }

    }


    return nodeList;
  }

  /**
   @returns {Array<Edge>} Un vector con los ejes ya presentes en el canvas.
  */
  getEdges(): Array<Edge> {
    //@ts-ignore
    const canvas = this.canvasView.canvas;
    const edges = [...canvas.edges].map((e) => {
      return new Edge(e[0], e[1].from.node.id, e[1].to.node.id, e[1].from.side, e[1].to.side, e[1].label);
    });
    return edges;
  }

  /**
   @returns {Edge[]} Un array con los nuevos ejes a añadir.
  */
  edgesFromMissingLinks(): [Edge[], TextNode[]] {
    //@ts-ignore
    const canvas = this.canvasView.canvas;

    const nodeMap: Map<string, any> = canvas.nodes;

    const missingLinks: Edge[] = new Array<Edge>();
    const missingNodes: TextNode[] = new Array<TextNode>();
    this.nodes.filter(isNoteNode).map(e => {
      let array: Array<[String, NamedLinkTree | Link]> = new Array();
      for (let link of e.links) {
        array.push([e.filePath, link]);
      }
      return array;
    }).flat().forEach(e => {
      if (isUnnamedLink(e[1])) {
        for (let edge of this.edges) {
          let fromPath: string = nodeMap.get(edge.fromNode.toString()).filePath;
          let toPath: string = nodeMap.get(edge.toNode.toString()).filePath;

          if (toPath === undefined) {
            continue;
          }

          if (fromPath !== e[0]) {
            continue;
          } e
          if (toPath === e[1].filePath) {
            return;
          }
        }

        let l = e[1];
        if (l.filePath === undefined) {
          return;
        }
        let fromNode: NoteNode = this.nodes.filter(isNoteNode).filter((n) => n.id === e[0])[0];
        let toNode: NoteNode = this.getNodeFromPath(l.filePath);
        let sides: [string, string] = getInOutSides(fromNode, toNode);
        //Añadir funcion que calcule de que lado tiene que salir el eje y a que lado tiene que llegar
        missingLinks.push(
          new Edge(
            randomUUID(),
            this.getNodeFromPath(e[0]).id.toString(),
            this.getNodeFromPath(toNode.filePath).id.toString(),
            sides[0],
            sides[1]
          )
        );
        /*
        Hay que crear una arista con estructura:app.workspace.getLeavesOfType('canvas')[0].view.canvas
         {
           fromNode: id del nodo saliente,
           fromSide: String con el lado del que sale la arista "right", "left", "up", "down
           id: Un String con una uuid unica para la arista
           toNode: id del nodo al que llega
           toSide: String con el lado al que llega la arista
          }
        */
      } else if (isNamedLink(e[1])) {
        let l: NamedLink = e[1];
        if (l.filePath === undefined) return;
        let toNode: NoteNode = this.getNodeFromPath(l.filePath);

        if (toNode === undefined) return;

        for (let edge of this.edges) {
          let fromPath: string = nodeMap.get(edge.fromNode.toString()).filePath;
          let toPath: string = nodeMap.get(edge.toNode.toString()).filePath;

          // Filtra los nodos de texto, pues no tienen filePath
          if (toPath === undefined) {
            continue;
          }

          if (edge.label !== l.name) {
            continue;
          }

          if (fromPath !== e[0]) {
            continue;
          }
          if (toPath === l.filePath) {
            return;
          }
        }

        let fromNode: NoteNode = this.nodes.filter(isNoteNode).filter((n) => n.id === e[0])[0];
        let sides: [string, string] = getInOutSides(fromNode, toNode);
        //Añadir funcion que calcule de que lado tiene que salir el eje y a que lado tiene que llegar

        missingLinks.push(
          new Edge(
            randomUUID(),
            this.getNodeFromPath(e[0]).id.toString(),
            this.getNodeFromPath(toNode.filePath).id.toString(),
            sides[0],
            sides[1],
            l.name
          )
        );
      } else if (isNamedLinkTree(e[1])) {
        let textNodePresent: boolean = true;

        let l = e[1];
        let textNodeId: string | null = null;
        for (let edge of this.edges.filter((e) => isTextNode(nodeMap.get(e.toNode.toString())))) {
          let fromPath: string = nodeMap.get(edge.fromNode.toString()).filePath;
          let toText: string = nodeMap.get(edge.toNode.toString()).text;

          if (toText === undefined || toText !== l.name || edge.label !== undefined || fromPath !== e[0]) {
            continue;
          }
          textNodeId = edge.toNode.toString();
        }
        if (textNodeId === null) {
          textNodePresent = false;
        }

        let allLinksPresent: boolean = true;
        let treeLinks = l.links.filter((f) => {
          for (let [_, node] of nodeMap) {
            if (node.filePath === f.filePath) return true;
          }
          return null;
        }).filter((e) => e !== null);

        let filteredEdges = this.edges.filter((f) => f.fromNode.toString() === textNodeId);

        for (let link of treeLinks) {
          let linkPresent: boolean = false;
          for (let edge of filteredEdges) {
            if (nodeMap.get(edge.toNode.toString()).filePath !== link.filePath) {
              continue;
            }
            linkPresent = true;
          }
          allLinksPresent = allLinksPresent && linkPresent;
        }
        if (allLinksPresent) {
          return;
        }

        let textNode: TextNode;
        if (textNodeId === null) {
          textNodeId = randomUUID();
          textNode = new TextNode(textNodeId, 0, 0, l.name);
        } else {
          textNode = nodeMap.get(textNodeId);
        }

        let fromNode: NoteNode = this.nodes.filter(isNoteNode).filter((n) => { return n.id === this.getNodeFromPath(e[0]).id; })[0];
        //Añadir funcion que calcule de que lado tiene que salir el eje y a que lado tiene que llegar

        let sides: [string, string] = getInOutSides(fromNode, textNode);

        missingLinks.push(
          new Edge(
            randomUUID(),
            this.getNodeFromPath(e[0]).id.toString(),
            textNodeId,
            sides[0],
            sides[1]
          )
        );


        for (let link of treeLinks) {
          if (link.filePath === undefined) {
            continue;
          }
          let toNode = this.getNodeFromPath(link.filePath);
          sides = getInOutSides(textNode, toNode);
          missingLinks.push(
            new Edge(
              randomUUID(),
              textNodeId,
              this.getNodeFromPath(link.filePath).id.toString(),
              sides[0],
              sides[1]
            )
          );
        }

        let lastId = missingLinks.last()?.toNode.toString();
        if (lastId !== undefined && textNodePresent === false) {
          textNode.position[0] = (fromNode.position[0] + nodeMap.get(lastId).x) / 2;
          textNode.position[1] = (fromNode.position[1] + nodeMap.get(lastId).y) / 2;
          missingNodes.push(
            textNode
          );
        }
      }
    });

    return [missingLinks, missingNodes];
  }

  private getNodeFromPath(filePath: String) {
    return this.nodes.filter(isNoteNode).filter((e) => e.filePath === filePath)[0];
  }


  /**
   @param {TFile} file - El objeto que representa al archivo del nodo del que se están leyendo.
   @returns {Array<NamedLink|NamedLinkTree>} Devuelve un vector con los enlaces del frontmatter de la nota que conforma el nodo, estos tienen que tener nombre por estar en el frontmatter.
  */
  private parseFrontmatterLinks(file: TFile): Array<NamedLink | NamedLinkTree> {
    var array: Array<NamedLink | NamedLinkTree> = new Array();
    const fm: FrontMatterCache | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const links: FrontmatterLinkCache[] | undefined = this.app.metadataCache.getFileCache(file)?.frontmatterLinks;

    if (fm === undefined || links === undefined) {
      return array;
    }

    for (let [k, v] of Object.entries(fm)) {
      if (Array.isArray(v)) {

        var filtered = v.filter(this.isLink);
        if (filtered.length === 0) continue;
        var treeArray: Array<UnnamedLink> = filtered.map((v) => {
          return this.linkFromText(v, file.path);
        });

        if (treeArray.length !== 0) {
          array.push(new NamedLinkTree(k, treeArray));
        }
      } else if (String.isString(v)) {
        if (this.isLink(v)) {
          var unamedLink = this.linkFromText(v, file.path);

          array.push(new NamedLink(k, unamedLink.fileName, unamedLink.filePath));
        }
      }
    }

    return array;
  }

  /**
   @param {string} s - La cadena a comprobar
   @returns {boolean} true si la cadena s es un enlace válido de obsidian y false en caso contrario
  */
  isLink(s: string): boolean {
    return s.substring(0, 2) === "[[" && s.substring(s.length - 2) === "]]";
  }

  /**
   @param {string} linkText - El texto del enlace a partie del que construimos el enlace.
   @param {string} filePath - La ruta al archivo del nodo.
  
   @returns {Link} Un objeto Link que representa el enlace de obsidian entre el archivo del nodo y el destino que se induce de la cadena filePath.
  */
  linkFromText(linkText: string, filePath: string): UnnamedLink {
    var name: string = linkText.substring(2, linkText.length - 2);

    var hayalias = name.indexOf("|");
    if (hayalias !== -1) {
      name = name.substring(0, hayalias);
    }
    var destfile: TFile | null = this.app.metadataCache.getFirstLinkpathDest(name.toString(), filePath);
    if (destfile === null) {
      return new UnnamedLink(name);
    }
    var destpath = destfile.path;

    // console.log(destpath);

    return new UnnamedLink(name, destpath);
  }

}

/*
 * Esta función la puedo implementar cuando me apetezca que quede mejor para que se elija automáticamente de que lado salen los ejes
*/
function getInOutSides(fromNode: Node, toNode: Node): [string, string] {
  return ["right", "left"]
}

